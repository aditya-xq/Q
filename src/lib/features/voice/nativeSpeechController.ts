import {
    isPunctuationOnlyVoiceSegment,
    isStructuralVoiceSegment,
    mergeVoiceSegment,
    normalizeVoiceText,
} from './textPostProcess'
import {
    DEFAULT_VOICE_CONFIG,
    type EditorApi,
    type VoiceControllerCallbacks,
    type VoiceControllerStatus,
    type VoiceTranscriptPatch,
    type VoiceTypingConfig,
    type VoiceTypingController,
} from './types'

type SpeechRecognitionCtor = new () => {
    continuous: boolean
    interimResults: boolean
    lang: string
    maxAlternatives: number
    onstart: (() => void) | null
    onresult: ((event: unknown) => void) | null
    onerror: ((event: unknown) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
}

type NativeSpeechWindow = Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
}

type SpeechRecognitionAlternativeLike = {
    transcript?: string
}

type SpeechRecognitionResultLike = {
    isFinal: boolean
    [index: number]: SpeechRecognitionAlternativeLike | undefined
}

type SpeechRecognitionEventLike = {
    resultIndex: number
    results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorEventLike = {
    error?: string
}

const PATCH_INTERVAL_MS = 110
const PATCH_MIN_INTERVAL_MS = 75
const START_TIMEOUT_MS = 6000
const STRUCTURAL_ARTIFACT_SUPPRESS_MS = 1800

function getNativeSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    const nativeWindow = window as NativeSpeechWindow
    return nativeWindow.SpeechRecognition ?? nativeWindow.webkitSpeechRecognition ?? null
}

export function isNativeSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!getNativeSpeechRecognitionCtor()
}

function mapRecognitionError(errorCode: string) {
    switch (errorCode) {
        case 'not-allowed':
        case 'service-not-allowed':
            return 'Microphone access is blocked. Allow microphone permission and try again.'
        case 'audio-capture':
            return 'No microphone input was detected. Check your audio device and try again.'
        case 'network':
            return 'Browser speech recognition service is currently unavailable. Please try again.'
        case 'language-not-supported':
            return 'The selected voice language is not supported by this browser.'
        default:
            return `Native speech recognition failed: ${errorCode || 'unknown error'}.`
    }
}

function appendText(base: string, incoming: string) {
    if (!base) return incoming
    if (!incoming) return base
    if (isPunctuationOnlyVoiceSegment(incoming) && /\n$/.test(base)) return base
    if (/^[,.;:!?\n]/.test(incoming)) return `${base}${incoming}`
    if (/\n$/.test(base)) return `${base}${incoming}`
    return `${base} ${incoming}`
}

export class NativeSpeechTypingController implements VoiceTypingController {
    private config: VoiceTypingConfig
    private callbacks: VoiceControllerCallbacks
    private editorApi: EditorApi
    private recognition: InstanceType<SpeechRecognitionCtor> | null = null

    private active = false
    private anchorStart = 0
    private anchorEnd = 0
    private committedText = ''
    private interimText = ''
    private lastPatchedText = ''
    private revision = 0
    private keepListening = false
    private stopping = false
    private starting = false
    private micPrimed = false
    private patchTimer: number | null = null
    private startTimer: number | null = null
    private restartTimer: number | null = null
    private lastPatchAt = 0
    private lastStructuralCommandAt = 0

    private status: VoiceControllerStatus = { state: 'idle' }

    constructor(editorApi: EditorApi, callbacks: VoiceControllerCallbacks, config?: Partial<VoiceTypingConfig>) {
        this.editorApi = editorApi
        this.callbacks = callbacks
        this.config = { ...DEFAULT_VOICE_CONFIG, ...(config ?? {}) }
    }

    updateConfig(partial: Partial<VoiceTypingConfig>) {
        this.config = { ...this.config, ...partial }
    }

    isActive() {
        return this.active
    }

    async start() {
        if (this.active || this.starting) return

        if (typeof window !== 'undefined' && !window.isSecureContext) {
            throw new Error('Voice typing requires a secure context (HTTPS or localhost).')
        }

        const ctor = getNativeSpeechRecognitionCtor()
        if (!ctor) {
            throw new Error('Native browser speech recognition is not available in this browser.')
        }

        await this.ensureMicrophoneAccess()
        this.releaseRecognition()
        this.resetSessionState()
        this.starting = true
        const selection = this.editorApi.getSelectionRange()
        this.editorApi.focus()
        this.anchorStart = selection.from
        this.anchorEnd = selection.to
        this.keepListening = true
        this.setState({ state: 'active', backend: 'native' })

        this.recognition = new ctor()
        this.recognition.continuous = true
        this.recognition.interimResults = true
        this.recognition.lang = this.config.locale
        this.recognition.maxAlternatives = 1

        this.recognition.onstart = () => {
            this.clearStartTimer()
            this.starting = false
            this.active = true
            this.setState({ state: 'active', backend: 'native' })
        }

        this.recognition.onresult = (rawEvent: unknown) => {
            const event = rawEvent as SpeechRecognitionEventLike
            let interimBuffer = ''
            let hasFinalResult = false

            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const result = event.results[i]
                const transcript = String(result?.[0]?.transcript ?? '').trim()
                if (!transcript) continue

                if (result.isFinal) {
                    const normalized = normalizeVoiceText(
                        transcript,
                        this.config.autoPunctuation,
                        this.config.commandMode
                    )
                    const deduped = mergeVoiceSegment(this.committedText, normalized)
                    if (!deduped) {
                        this.interimText = ''
                        hasFinalResult = true
                        continue
                    }

                    const isLikelyCommandArtifact =
                        isPunctuationOnlyVoiceSegment(deduped) &&
                        Date.now() - this.lastStructuralCommandAt < STRUCTURAL_ARTIFACT_SUPPRESS_MS
                    if (isLikelyCommandArtifact) {
                        this.interimText = ''
                        hasFinalResult = true
                        continue
                    }

                    if (isStructuralVoiceSegment(deduped)) {
                        this.lastStructuralCommandAt = Date.now()
                    } else if (deduped.trim()) {
                        this.lastStructuralCommandAt = 0
                    }

                    this.committedText = appendText(this.committedText, deduped)
                    this.interimText = ''
                    hasFinalResult = true
                } else {
                    interimBuffer = appendText(interimBuffer, transcript)
                }
            }

            if (interimBuffer) {
                const normalizedInterim = normalizeVoiceText(
                    interimBuffer,
                    this.config.autoPunctuation,
                    this.config.commandMode
                )
                const isLikelyCommandArtifact =
                    isPunctuationOnlyVoiceSegment(normalizedInterim) &&
                    Date.now() - this.lastStructuralCommandAt < STRUCTURAL_ARTIFACT_SUPPRESS_MS
                this.interimText = isLikelyCommandArtifact ? '' : normalizedInterim
            } else {
                this.interimText = ''
            }

            if (hasFinalResult) {
                this.clearPatchTimer()
                this.applyPatch()
                return
            }

            this.schedulePatch()
        }

        this.recognition.onerror = (rawEvent: unknown) => {
            const event = rawEvent as SpeechRecognitionErrorEventLike
            if (this.stopping) {
                return
            }

            this.clearStartTimer()
            this.starting = false
            const errorCode = String(event?.error ?? '')
            const isTransient = errorCode === 'no-speech' || errorCode === 'aborted'

            if (isTransient && this.keepListening) {
                return
            }
            if (isTransient) {
                this.setState({ state: 'idle', backend: 'native' })
                return
            }

            const message = mapRecognitionError(errorCode)

            this.active = false
            this.keepListening = false
            this.clearRestartTimer()
            this.setState({ state: 'error', backend: 'native' })
            this.callbacks.onError?.(message)
        }

        this.recognition.onend = () => {
            this.clearStartTimer()
            this.starting = false
            this.active = false
            if (this.keepListening && this.recognition) {
                this.starting = true
                this.scheduleStartTimer()
                this.scheduleRecognitionRestart()
                return
            }

            if (this.status.state === 'error') {
                return
            }
            this.setState({ state: 'idle', backend: 'native' })
        }

        try {
            this.scheduleStartTimer()
            this.recognition.start()
        } catch (error) {
            this.clearStartTimer()
            this.starting = false
            this.keepListening = false
            this.active = false
            this.releaseRecognition()
            throw error
        }
    }

    async stop() {
        if (this.stopping) return
        if (!this.active && !this.recognition && !this.starting) return

        this.stopping = true
        this.clearStartTimer()
        this.clearRestartTimer()
        this.starting = false
        this.keepListening = false
        this.active = false

        try {
            if (this.recognition) {
                const recognition = this.recognition
                try {
                    this.recognition.stop()
                } catch {
                    // Ignore stop races; handlers are detached below.
                }
                this.releaseRecognition(recognition)
            }

            if (this.interimText) {
                const deduped = mergeVoiceSegment(this.committedText, this.interimText)
                this.committedText = appendText(this.committedText, deduped)
                this.interimText = ''
            }

            this.clearPatchTimer()
            this.applyPatch(true)
            this.setState({ state: 'idle', backend: 'native' })
        } finally {
            this.stopping = false
        }
    }

    async destroy() {
        await this.stop()
    }

    private applyPatch(final = false) {
        const nextText = appendText(this.committedText, this.interimText)
        if (!final && nextText === this.lastPatchedText) return

        const previousText = this.lastPatchedText
        let sharedPrefix = 0
        const maxPrefix = Math.min(previousText.length, nextText.length)
        while (sharedPrefix < maxPrefix && previousText[sharedPrefix] === nextText[sharedPrefix]) {
            sharedPrefix += 1
        }

        let sharedSuffix = 0
        const maxSuffix = Math.min(previousText.length - sharedPrefix, nextText.length - sharedPrefix)
        while (
            sharedSuffix < maxSuffix &&
            previousText[previousText.length - 1 - sharedSuffix] === nextText[nextText.length - 1 - sharedSuffix]
        ) {
            sharedSuffix += 1
        }

        const replaceFrom = this.anchorStart + sharedPrefix
        const replaceTo = this.anchorStart + (previousText.length - sharedSuffix)
        const replacement = nextText.slice(sharedPrefix, nextText.length - sharedSuffix)

        if (replaceFrom !== replaceTo || replacement) {
            this.editorApi.replaceRange({ from: replaceFrom, to: replaceTo }, replacement)
        }
        this.anchorEnd = this.anchorStart + nextText.length
        this.revision += 1
        this.lastPatchedText = nextText
        this.lastPatchAt = Date.now()

        const patch: VoiceTranscriptPatch = {
            text: nextText,
            final,
            revision: this.revision,
            backend: 'native',
        }

        this.callbacks.onTranscriptPatch?.(patch)
    }

    private schedulePatch() {
        const now = Date.now()
        const timeSinceLastPatch = now - this.lastPatchAt
        if (timeSinceLastPatch >= PATCH_INTERVAL_MS) {
            this.clearPatchTimer()
            this.applyPatch()
            return
        }

        if (this.patchTimer !== null) return
        const waitMs = Math.max(PATCH_MIN_INTERVAL_MS, PATCH_INTERVAL_MS - timeSinceLastPatch)
        this.patchTimer = window.setTimeout(() => {
            this.patchTimer = null
            this.applyPatch()
        }, waitMs)
    }

    private clearPatchTimer() {
        if (this.patchTimer === null) return
        clearTimeout(this.patchTimer)
        this.patchTimer = null
    }

    private scheduleStartTimer() {
        this.clearStartTimer()
        this.startTimer = window.setTimeout(() => {
            if (!this.starting) return

            this.starting = false
            this.keepListening = false
            this.active = false
            this.clearRestartTimer()
            this.releaseRecognition()

            const message = 'Microphone did not start in time. Please try again.'
            this.setState({ state: 'error', backend: 'native' })
            this.callbacks.onError?.(message)
        }, START_TIMEOUT_MS)
    }

    private clearStartTimer() {
        if (this.startTimer === null) return
        clearTimeout(this.startTimer)
        this.startTimer = null
    }

    private scheduleRecognitionRestart() {
        this.clearRestartTimer()
        this.restartTimer = window.setTimeout(() => {
            this.restartTimer = null
            if (!this.keepListening || !this.recognition) return

            try {
                this.recognition.start()
            } catch {
                this.clearStartTimer()
                this.starting = false
                this.keepListening = false
                this.active = false
                this.releaseRecognition()
                const message = 'Microphone reconnect failed. Start voice typing again.'
                this.setState({ state: 'error', backend: 'native' })
                this.callbacks.onError?.(message)
            }
        }, 180)
    }

    private clearRestartTimer() {
        if (this.restartTimer === null) return
        clearTimeout(this.restartTimer)
        this.restartTimer = null
    }

    private releaseRecognition(recognition: InstanceType<SpeechRecognitionCtor> | null = this.recognition) {
        if (!recognition) return
        recognition.onstart = null
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        if (this.recognition === recognition) {
            this.clearRestartTimer()
            this.recognition = null
        }
    }

    private async ensureMicrophoneAccess() {
        if (this.micPrimed) return
        if (typeof navigator === 'undefined') return
        if (!navigator.mediaDevices?.getUserMedia) return

        let stream: MediaStream | null = null
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            this.micPrimed = true
        } catch {
            throw new Error(
                'Microphone access is required for voice typing. Allow microphone permission and try again.'
            )
        } finally {
            stream?.getTracks().forEach((track) => track.stop())
        }
    }

    private setState(next: Partial<VoiceControllerStatus>) {
        this.status = { ...this.status, ...next }
        this.callbacks.onStateChange?.(this.status)
    }

    private resetSessionState() {
        this.clearPatchTimer()
        this.clearStartTimer()
        this.clearRestartTimer()
        this.starting = false
        this.lastPatchAt = 0
        this.lastStructuralCommandAt = 0
        this.committedText = ''
        this.interimText = ''
        this.lastPatchedText = ''
        this.revision = 0
        this.keepListening = false
    }
}

export function createNativeSpeechTypingController(
    editorApi: EditorApi,
    callbacks: VoiceControllerCallbacks,
    config?: Partial<VoiceTypingConfig>
): VoiceTypingController {
    return new NativeSpeechTypingController(editorApi, callbacks, config)
}

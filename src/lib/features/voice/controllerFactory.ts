import { createNativeSpeechTypingController, isNativeSpeechRecognitionSupported } from './nativeSpeechController'
import { DEFAULT_VOICE_CONFIG, type EditorApi, type VoiceControllerCallbacks, type VoiceTypingConfig } from './types'

export interface VoiceTypingSupport {
    native: boolean
}

export function getVoiceTypingSupport(): VoiceTypingSupport {
    return {
        native: isNativeSpeechRecognitionSupported(),
    }
}

export function resolveVoiceBackend() {
    const support = getVoiceTypingSupport()
    if (!support.native) {
        throw new Error('Native browser speech recognition is unavailable in this browser.')
    }
    return 'native' as const
}

export function createVoiceTypingController(
    editorApi: EditorApi,
    callbacks: VoiceControllerCallbacks,
    config?: Partial<VoiceTypingConfig>
) {
    const merged = { ...DEFAULT_VOICE_CONFIG, ...(config ?? {}), backend: 'native' as const }
    resolveVoiceBackend()
    return createNativeSpeechTypingController(editorApi, callbacks, merged)
}

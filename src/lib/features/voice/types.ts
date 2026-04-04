export type VoiceEngineState = 'idle' | 'active' | 'error'

export type VoiceBackend = 'native'

export interface VoiceTranscriptPatch {
    text: string
    final: boolean
    revision: number
    backend: string
}

export interface VoiceTypingConfig {
    autoPunctuation: boolean
    locale: string
    backend: VoiceBackend
    commandMode: 'strict' | 'assist'
}

export interface EditorRange {
    from: number
    to: number
}

export interface EditorApi {
    getSelectionRange: () => EditorRange
    replaceRange: (range: EditorRange, text: string) => EditorRange
    moveCursorToEnd: () => EditorRange
    focus: () => void
    getMarkdown: () => string
}

export interface VoiceControllerStatus {
    state: VoiceEngineState
    backend?: VoiceBackend
}

export interface VoiceControllerCallbacks {
    onStateChange?: (status: VoiceControllerStatus) => void
    onTranscriptPatch?: (patch: VoiceTranscriptPatch) => void
    onError?: (message: string) => void
}

export interface VoiceTypingController {
    start: () => Promise<void>
    stop: () => Promise<void>
    destroy: () => Promise<void>
    isActive: () => boolean
    updateConfig: (partial: Partial<VoiceTypingConfig>) => void
}

export const DEFAULT_VOICE_CONFIG: VoiceTypingConfig = {
    autoPunctuation: true,
    locale: 'en-US',
    backend: 'native',
    commandMode: 'assist',
}

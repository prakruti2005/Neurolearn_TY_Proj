export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY?: string
      OPENAI_WHISPER_MODEL?: string
      WHISPER_MAX_BYTES?: string
    }
  }
}

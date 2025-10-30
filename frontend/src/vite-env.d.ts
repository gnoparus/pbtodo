/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POCKETBASE_URL: string
  readonly VITE_HTTPS_ENABLED: string
  readonly VITE_SESSION_TIMEOUT_MINUTES: string
  readonly VITE_MIN_PASSWORD_LENGTH: string
  readonly VITE_REQUIRE_PASSWORD_COMPLEXITY: string
  readonly VITE_MAX_LOGIN_ATTEMPTS_PER_MINUTE: string
  readonly VITE_DEV_MODE: string
  readonly VITE_ALLOWED_ORIGINS: string
  readonly VITE_ENABLE_SECURITY_HEADERS: string
  readonly VITE_ENABLE_CSP: string
  readonly VITE_ENABLE_HSTS: string
  // Add more environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables for tests
vi.stubGlobal('import.meta', {
  env: {
    VITE_POCKETBASE_URL: 'http://127.0.0.1:8090',
    VITE_HTTPS_ENABLED: 'false',
    VITE_SESSION_TIMEOUT_MINUTES: '1440',
    VITE_MIN_PASSWORD_LENGTH: '8',
    VITE_REQUIRE_PASSWORD_COMPLEXITY: 'true',
    VITE_MAX_LOGIN_ATTEMPTS_PER_MINUTE: '5',
    VITE_DEV_MODE: 'true',
    VITE_ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
    VITE_ENABLE_SECURITY_HEADERS: 'true',
    VITE_ENABLE_CSP: 'true',
    VITE_ENABLE_HSTS: 'true',
  },
})

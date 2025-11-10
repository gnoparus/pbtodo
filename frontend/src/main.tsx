import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { validateConfig } from './config/environment'
import {
  applySecurityHeaders,
  validateSecurityHeaders,
  initializeSecurityMonitoring,
  addSRIToIntegrityAttributes
} from './services/securityHeaders'

// Validate configuration before starting the app
try {
  validateConfig()
} catch (error) {
  console.error('❌ Configuration validation failed:', error)
  // In production, you might want to show a user-friendly error page
  if (!import.meta.env.DEV) {
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <div style="text-align: center; max-width: 400px; padding: 20px;">
          <h1 style="color: #dc3545;">⚠️ Configuration Error</h1>
          <p>The application cannot start due to invalid configuration.</p>
          <p style="font-size: 0.9em; color: #666;">Please contact support if this problem persists.</p>
        </div>
      </div>
    `
    throw error
  }
}

// Initialize security headers
applySecurityHeaders({
  cspReportOnly: import.meta.env.DEV, // Use report-only mode in development
  strictDynamic: true,
  allowFullscreen: false,
  allowPayment: false,
  allowSyncXHR: false
})

// Initialize security monitoring
initializeSecurityMonitoring()

// Add SRI to external resources
addSRIToIntegrityAttributes()

// Validate security headers in development
if (import.meta.env.DEV) {
  const validation = validateSecurityHeaders()
  if (!validation.valid) {
    console.warn('⚠️ Security Header Validation Issues:', {
      missing: validation.missing,
      warnings: validation.warnings
    })
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// client/src/config/api.js
//
// Single source of truth for the backend API URL.
// In development: defaults to http://localhost:3000
// In production:  reads from VITE_API_BASE env variable
//
// Usage:
//   import { API_BASE } from '@/config/api.js'
//   fetch(`${API_BASE}/api/health`)

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

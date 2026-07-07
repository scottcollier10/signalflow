/**
 * Backend API base URL.
 *
 * Configurable via NEXT_PUBLIC_API_BASE_URL (see .env.local.example);
 * defaults to the local dev backend.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8001';

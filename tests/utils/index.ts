/**
 * Module test template notes (reuse for home/, activity/, directory/):
 *
 * tests/
 *   setup.ts                 — global mocks
 *   utils/                   — fixtures + HTTP mocks shared across modules
 *   chat/                    — Chat Group module
 *   home/                    — (future)
 *   activity/                — (future)
 *
 * Layers:
 * 1. Unit — pure helpers (no RN render)
 * 2. API  — axios-mocked service functions (UI↔API contract)
 * 3. UI   — RNTL for components when exported
 * 4. E2E  — Maestro/Detox against staging API+DB (not in this suite yet)
 */
export {};

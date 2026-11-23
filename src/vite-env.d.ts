/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COVER_API_BASE?: string;
  readonly VITE_NEON_AUTH_URL?: string;
  readonly VITE_NEON_SYNC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

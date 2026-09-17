/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_MONITOR_API_URL?: string;
  readonly VITE_MONITOR_DASHBOARD_URL?: string;
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

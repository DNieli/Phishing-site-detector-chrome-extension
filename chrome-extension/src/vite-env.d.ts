/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VT_API_KEY?: string;
  readonly VT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

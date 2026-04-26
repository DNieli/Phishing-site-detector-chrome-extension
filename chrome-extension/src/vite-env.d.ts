/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

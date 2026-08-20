/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GOOGLE_SHEET_ID: string;
  readonly GOOGLE_SHEETS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

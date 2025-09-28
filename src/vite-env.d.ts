/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CASHFREE_APP_ID: string
  readonly VITE_CASHFREE_SECRET_KEY: string
  readonly VITE_CASHFREE_PROD_APP_ID: string
  readonly VITE_CASHFREE_PROD_SECRET_KEY: string
  readonly VITE_API_BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

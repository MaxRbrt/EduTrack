//////////////////////////////
// Tipos das variáveis de ambiente lidas pela aplicação.
// VITE_MODO_DADOS: "api" (padrão) usa o servidor; "memoria" guarda tudo
// só no navegador, para desenvolver sem servidor.
//////////////////////////////

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODO_DADOS?: 'memoria' | 'api';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

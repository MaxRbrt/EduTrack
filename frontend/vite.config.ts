import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Mesma origem para o navegador: /api vai para a API local (backend/api, porta 3001).
  server: { proxy: { '/api': 'http://localhost:3001' } },
});

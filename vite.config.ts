import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Date de build, injectée à la compilation (mise à jour à chaque déploiement).
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
})

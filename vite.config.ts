import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Inside WSL, edits made from Windows to files under /mnt/ fire no inotify events, so poll instead.
    watch: process.cwd().startsWith('/mnt/') ? { usePolling: true } : undefined,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})

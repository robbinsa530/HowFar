import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      // Add new routes here!
      // This is just so dev client can hit dev server
      '/checkHasToken': 'http://localhost:3001',
      '/getApiTokens': 'http://localhost:3001',
      '/saveToken': 'http://localhost:3001',
      '/saveDefaultLocation': 'http://localhost:3001',
      '/clearDefaultLocation': 'http://localhost:3001',
      '/getDefaultLocation': 'http://localhost:3001',
      '/stravaUser': 'http://localhost:3001',
      '/postManualActivityToStrava': 'http://localhost:3001',
      '/uploadToStrava': 'http://localhost:3001',
      '/exportGpx': 'http://localhost:3001'
    }
  }
})

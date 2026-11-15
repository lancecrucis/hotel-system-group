import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const backendEnv = loadEnv(mode, '../backend', '')
  return {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: { '@': new URL('src', import.meta.url).pathname },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.PORT || backendEnv.PORT || '3000'}`,
          changeOrigin: true,
        },
      },
    },
  }
})

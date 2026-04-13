import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/proxy-groq': {
        target: 'https://api.groq.com/openai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-groq/, '')
      }
    }
  }
});

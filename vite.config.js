import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/proxy-hf': {
        target: 'https://api-inference.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-hf/, '')
      }
    }
  }
});

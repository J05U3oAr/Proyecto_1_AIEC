import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-sdk',
    lib: {
      entry: path.resolve(__dirname, 'src/sdk/index.ts'),
      name: 'AGIChat',
      formats: ['es', 'umd'],
      cssFileName: 'agichat-widget',
      fileName: format => (format === 'es' ? 'agichat-widget.js' : 'agichat-widget.umd.cjs'),
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});

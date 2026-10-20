import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works under any GitHub Pages path.
  base: './',
  plugins: [react()],
});

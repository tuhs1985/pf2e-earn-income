import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/pf2e-earn-income/', // 👈 important for GitHub Pages
  plugins: [react()],
});

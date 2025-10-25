// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), sitemap()],
  adapter: cloudflare(),

  vite: {
    plugins: [tailwindcss()]
  }
});
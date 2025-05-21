
import { defineConfig } from 'astro/config';
import { esES } from '@clerk/localizations';
import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';
import clerk from '@clerk/astro';

import react from '@astrojs/react';


export default defineConfig({
  output: 'server',
  adapter: netlify({ edge: true }),
  integrations: [
    clerk({ localization: esES }),
    react() 
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});

import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  site: 'https://stylehub-frontend.vercel.app',
  integrations: [tailwind()],
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  output: 'server',
});

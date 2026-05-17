import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';
import rehypeShiki from '@shikijs/rehype';
import remarkEmoji from 'remark-emoji';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://vitorsampa.io',
  output: 'static',
  trailingSlash: 'never',

  integrations: [
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap(),
    compress({
      HTML: true,
      CSS: true,
      JavaScript: { terser: { compress: { drop_console: true, drop_debugger: true } } },
      Image: false,
      SVG: true,
    }),
  ],

  markdown: {
    remarkPlugins: [remarkEmoji],
    rehypePlugins: [[rehypeShiki, { theme: 'vitesse-dark' }]],
    syntaxHighlight: false,
  },

  adapter: cloudflare()
});
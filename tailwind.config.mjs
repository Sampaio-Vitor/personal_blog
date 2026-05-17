/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        'background-alt': 'var(--background-alt)',
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        'surface-strong': 'var(--surface-strong)',
        'surface-muted': 'var(--surface-muted)',
        foreground: 'var(--foreground)',
        'foreground-muted': 'var(--foreground-muted)',
        'foreground-subtle': 'var(--foreground-subtle)',
        'foreground-inverse': 'var(--foreground-inverse)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
      },
      boxShadow: {
        brutal: '4px 4px 0 0 var(--shadow-color)',
        'brutal-sm': '2px 2px 0 0 var(--shadow-color)',
        'brutal-lg': '6px 6px 0 0 var(--shadow-color)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        display: ['"JetBrains Mono"', '"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      screens: { xs: '480px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

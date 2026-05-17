# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project intent

A new personal blog / portfolio that mixes two reference projects:

- **Architecture & content model** from [ashleymcnamara/ashley.dev](https://github.com/ashleymcnamara/ashley.dev) — Astro static site, IDE-window page shell, filename-style tab navigation, markdown content collections.
- **Visual language** from [pingdotgg/lawn](https://github.com/pingdotgg/lawn) — warm cream + forest green palette, Geist / Instrument Serif typography, neo-brutalist hard-shadow buttons, **sharp corners (no border-radius)**.

The repo is currently empty. The first task is scaffolding the Astro project with these conventions baked in from day one. When you're unsure about a wiring detail, check ashley.dev's equivalent file. When you're unsure about a visual detail, check lawn's `app/app.css` or `src/components/ui/`.

## Target stack

- **Astro 6** (`output: 'static'`, `trailingSlash: 'never'`). Prerender everything; do not reach for a SPA framework.
- **Tailwind CSS** (v3 with `@tailwindcss/typography`, or v4 with `@theme inline` — pick v3 to stay close to ashley.dev's setup unless we have a reason).
- **CSS variables** for the palette (light + dark), wired into Tailwind via `extend.colors` referencing `var(--...)`. Lawn's pattern, not ashley.dev's hardcoded `primary`.
- **SCSS** at `src/styles/global.scss` for tokens, font-face declarations, scrollbar styling, and code-block chrome.
- **MDX** (`@astrojs/mdx`) for blog posts with:
  - `rehype-shiki` using `vitesseDark` from `shiki/themes`.
  - `remark-emoji` for shortcode emoji.
  - Optional custom rehype plugins for heading anchors / TOC (see ashley.dev `src/utils/rehypeHeadingColors.js`, `rehypeTableOfContents.js`).
- **`@astrojs/sitemap`** + RSS at `/rss.xml` via `@astrojs/rss`.
- **`astro-compress`** for HTML/CSS/JS minification at build; terser config drops `console`/`debugger`.
- **Satori + `@vercel/og` + `@resvg/resvg-js`** when generated OG images are wanted.
- Node `>=22 <25`, npm `>=11`.

Do **not** add React/Vue/Svelte unless an island genuinely requires it. Astro components (`.astro`) are the default.

## Commands (once scaffolded)

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install deps                                 |
| `npm run dev`     | Local dev server (Astro default: `:4321`)    |
| `npm run build`   | Build static site to `./dist/`               |
| `npm run preview` | Preview the production build locally         |
| `npm run astro …` | Astro CLI passthrough (e.g. `astro check`)   |

## File structure (mirror ashley.dev)

```
src/
├── components/
│   ├── SiteShell.astro        # The "window" wrapper: border + filename tabs + 2-pane layout
│   ├── Profile.astro          # Left-pane identity (name, role, blurb)
│   ├── Contact.astro          # Left-pane socials
│   ├── PostCard.astro         # Blog/projects list item
│   └── ui/
│       ├── Button.astro       # Neo-brutalist button (see Visual System)
│       ├── Tag.astro          # Pill-style tag chip
│       └── Card.astro         # Sharp-cornered hard-shadow card
├── content/
│   ├── config.ts              # Content collection schema (zod)
│   └── posts/                 # Blog posts in .md / .mdx
├── data/
│   └── projects.ts            # Typed TS arrays for non-markdown content
├── layouts/
│   └── Layout.astro           # <html>/<head>: SEO, OG, JSON-LD, RSS link, favicon, font imports
├── pages/
│   ├── index.astro            # About tab
│   ├── blog/index.astro
│   ├── blog/[slug].astro      # Dynamic post route
│   ├── projects/index.astro
│   └── rss.xml.ts
├── styles/
│   └── global.scss            # CSS variables, @font-face, code-block chrome
├── types/content.ts
└── utils/
    ├── filtering.ts           # Shared tag-filter helper (URL-driven via ?tag=)
    └── rehype-*.ts            # Custom MDX plugins
```

## Architectural rules

1. **`SiteShell.astro` is the visual identity.** A flex container (`flex-col md:flex-row`) wrapping the whole page. Left pane (`md:w-2/5`) = `<Profile />` on top and `<Contact />` on bottom. Right pane (`md:w-4/5`) = sticky tab bar at top + scrollable content. Every page wraps its content in this shell and passes an `active` prop.
2. **Tabs are real routes**, not client state. Tab labels look like filenames — and the file extensions lean Python, not TypeScript, since the site owner is an ML / software engineer who writes Python: `about.py`, `projects.md`, `blog.md`. Each links to `/`, `/projects`, `/blog`. The active tab gets a thick bottom border and accent color (see Visual System).
3. **`Layout.astro` owns all `<head>` SEO.** Open Graph, Twitter card, Dublin Core, JSON-LD `Person` block, RSS `<link rel="alternate">`, sitemap, canonical. Body class wires the theme: `bg-[var(--background)] text-[var(--foreground)] font-mono`.
4. **Content collections + zod** validate post frontmatter at build. Frontmatter fields: `title`, `date`, `tags`, optional `description`, optional `coverImage`, optional embed URIs (e.g. Bluesky).
5. **Filtering is URL-driven** (`?tag=foo`). One small inline `<script>` per filtered page reads `URLSearchParams`, filters the rendered DOM, and uses `history.replaceState` to keep URLs clean. No client framework, no state library.
6. **Build-time data fetches** (e.g. Bluesky engagement via `@atproto/api`) live in the Astro frontmatter of the post page, not in client JS. Site stays fully static.
7. **Light theme only.** The warm cream + forest green palette is the whole identity — do not add a dark mode, theme toggle, or `prefers-color-scheme` override. Owner explicitly rejected the toggle; keep `color-scheme: light` and a single set of CSS variables.

## Visual System (the lawn × ashley.dev merge)

### Palette — CSS variables (drop into `global.scss`)

```css
:root {
  /* Core */
  --background: #f0f0e8;        /* warm cream */
  --background-alt: #1a1a1a;
  --surface: #ffffff;
  --surface-alt: #e8e8e0;
  --surface-strong: #1a1a1a;
  --surface-muted: #d8d8d0;

  /* Text */
  --foreground: #1a1a1a;
  --foreground-muted: #888888;
  --foreground-subtle: #aaaaaa;
  --foreground-inverse: #f0f0e8;

  /* Borders & shadow */
  --border: #1a1a1a;
  --border-subtle: #cccccc;
  --shadow-color: #1a1a1a;

  /* Accent — forest green */
  --accent: #2d5a2d;
  --accent-hover: #3a6a3a;
  --accent-light: #7cb87c;

  /* Semantic */
  --destructive: #dc2626;
  --success: #16a34a;
  --warning: #ca8a04;

  --ring: var(--accent);
  color-scheme: light;
}
```

Light-only — no `[data-theme="dark"]` block, no `prefers-color-scheme` override.

Wire into Tailwind:

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      background: 'var(--background)',
      surface: 'var(--surface)',
      'surface-alt': 'var(--surface-alt)',
      foreground: 'var(--foreground)',
      'foreground-muted': 'var(--foreground-muted)',
      border: 'var(--border)',
      accent: 'var(--accent)',
      'accent-hover': 'var(--accent-hover)',
      'accent-light': 'var(--accent-light)',
    },
    boxShadow: {
      brutal:    '4px 4px 0 0 var(--shadow-color)',
      'brutal-sm': '2px 2px 0 0 var(--shadow-color)',
      'brutal-lg': '6px 6px 0 0 var(--shadow-color)',
    },
    screens: { xs: '480px' },
  },
}
```

### Typography

Three faces. Use them deliberately.

```css
/* In global.scss */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=block');

@font-face { font-family: 'Geist';      src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Regular.woff2')  format('woff2'); font-weight: 400; font-display: block; }
@font-face { font-family: 'Geist';      src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Medium.woff2')   format('woff2'); font-weight: 500; font-display: block; }
@font-face { font-family: 'Geist';      src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-SemiBold.woff2') format('woff2'); font-weight: 600; font-display: block; }
@font-face { font-family: 'Geist';      src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Bold.woff2')     format('woff2'); font-weight: 700; font-display: block; }
@font-face { font-family: 'Geist';      src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Black.woff2')    format('woff2'); font-weight: 900; font-display: block; }
@font-face { font-family: 'Geist Mono'; src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-mono/GeistMono-Regular.woff2') format('woff2'); font-weight: 400; font-display: block; }
@font-face { font-family: 'Geist Mono'; src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-mono/GeistMono-Medium.woff2')  format('woff2'); font-weight: 500; font-display: block; }

body { font-family: 'Geist Mono', ui-monospace, monospace; -webkit-font-smoothing: antialiased; }
.font-sans  { font-family: 'Geist', system-ui, -apple-system, sans-serif; }
.font-mono  { font-family: 'Geist Mono', ui-monospace, monospace; }
.font-serif { font-family: 'Instrument Serif', Georgia, serif; }
```

Tailwind:

```js
fontFamily: {
  sans:  ['Geist', 'system-ui', 'sans-serif'],
  mono:  ['"Geist Mono"', 'ui-monospace', 'monospace'],
  serif: ['"Instrument Serif"', 'Georgia', 'serif'],
},
```

Usage rules:

- **Body / UI / nav / buttons / metadata**: `font-mono` (Geist Mono). This is the default.
- **Long-form prose inside posts**: `font-sans` (Geist). Apply on the article container so paragraphs are readable.
- **Display headings, post titles, hero text**: `font-serif italic` (Instrument Serif) — this is the "feature" font and should appear sparingly. Pair big serif titles with mono metadata for the lawn contrast.

### Sharp corners — no border-radius

We're going with lawn's sharp look. **Do not use `rounded-*` utilities anywhere.** No `rounded-md`, no `rounded-2xl`, not even on images. Add this safety net in `global.scss`:

```css
* { border-radius: 0 !important; } /* Optional hard guarantee */
```

(Or just be disciplined; the explicit reset is a fail-safe.)

### Buttons — the signature component

Neo-brutalist with hard offset shadow that "presses" on hover and active. Use `class-variance-authority` if you ship a React island; otherwise an Astro component with a `variant` prop and concatenated class strings.

Base classes (every variant):

```
inline-flex items-center justify-center gap-2 whitespace-nowrap
text-sm font-bold uppercase tracking-wider font-mono
border-2 border-foreground
shadow-brutal
transition-all
hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-sm
active:translate-x-[2px] active:translate-y-[2px]
disabled:pointer-events-none disabled:opacity-40
[&_svg]:size-4 [&_svg]:shrink-0
```

Variants:

| variant       | bg / text                                                | hover bg            |
| :------------ | :------------------------------------------------------- | :------------------ |
| `default`     | `bg-foreground text-background`                          | `bg-accent`         |
| `primary`     | `bg-accent text-background`                              | `bg-accent-hover`   |
| `outline`     | `bg-transparent text-foreground`                         | `bg-foreground text-background` |
| `secondary`   | `bg-surface-alt text-foreground`                         | `bg-surface-muted`  |
| `destructive` | `bg-[var(--destructive)] text-white`                     | darker red          |
| `ghost`       | no border/shadow at rest → border + shadow appear on hover | `bg-foreground text-background` |
| `link`        | underlined, no shadow, color → `accent` on hover         | n/a                 |

Sizes: `sm` = `h-8 px-4 text-xs`, `default` = `h-10 px-5`, `lg` = `h-12 px-8 text-base`, `icon` = `h-10 w-10`.

### Cards & panels

Anywhere ashley.dev would use `rounded-2xl shadow-2xl`, use **sharp + brutal** instead:

```
border-2 border-foreground bg-surface shadow-brutal
```

This includes the `SiteShell` outer wrapper, post cards, project cards, code-block wrappers, callouts. One consistent texture across the site.

### Tabs (the filename nav)

Keep ashley.dev's filename metaphor; restyle with lawn's texture:

- Container: `flex bg-background border-b-2 border-foreground sticky top-0 z-10`.
- Each tab: `font-mono uppercase tracking-wider text-xs px-4 py-2 border-r-2 border-foreground`.
- Active tab: `bg-accent text-background` (or `border-b-4 border-accent` if you want the active state inside the bar).
- Hover: `bg-surface-alt`.
- File-icon SVG stays — lucide-react has a `FileText` equivalent; for `.astro` files use an inline SVG.

### Code blocks

Shiki produces `<pre><code>`. Wrap and chrome it:

```scss
pre {
  border: 2px solid var(--foreground);
  background: var(--surface-strong) !important; /* keep code on near-black even in light mode */
  color: #d4d4d4;
  padding: 1rem;
  margin: 1.5rem 0;
  box-shadow: 4px 4px 0 0 var(--shadow-color);
  overflow-x: auto;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.85rem;
}

pre[data-filename]::before {   /* Header bar with filename, mirrors ashley.dev */
  content: attr(data-filename);
  display: block;
  background: #1c1c1c;
  color: #d4d4d4;
  font-family: 'Geist Mono', monospace;
  font-size: 0.85rem;
  padding: 0.25rem 1rem;
  border-bottom: 1px solid #2d2d2d;
  margin: -1rem -1rem 1rem -1rem;
}

:not(pre) > code {
  background: var(--surface-alt);
  color: var(--foreground);
  border: 1px solid var(--border-subtle);
  padding: 0.1em 0.35em;
  font-family: 'Geist Mono', monospace;
  font-size: 0.85em;
}

.highlighted-line {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  display: block;
  margin: 0 -1rem;
  padding: 0 1rem;
  border-left: 3px solid var(--accent-light);
}
```

### Selection, scrollbar, focus

```css
::selection { background: var(--accent); color: var(--foreground-inverse); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-subtle); }
::-webkit-scrollbar-thumb:hover { background: var(--foreground-muted); }

.focus-ring:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

### Animations (optional, copy from lawn if you want them)

Keyframes lawn ships: `fade-in`, `fade-out`, `slide-up`, `slide-in-from-{top,bottom,left,right}` paired with `.animate-in` / `.animate-out` utility classes. Use sparingly — for tab transitions and `<dialog>` enter/exit, not for general scroll reveals.

## Prose (post body) styling

Apply `@tailwindcss/typography`'s `prose` class to the article wrapper, then override:

```html
<article class="prose prose-lg max-w-none font-sans
                prose-headings:font-serif prose-headings:italic
                prose-h1:text-5xl prose-h2:text-3xl
                prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground
                prose-code:font-mono
                prose-blockquote:border-l-4 prose-blockquote:border-accent
                prose-blockquote:bg-surface-alt prose-blockquote:not-italic">
  <slot />
</article>
```

The contrast — serif italic headings against mono UI — is the visual hook. Don't dilute it.

## Style discipline (do/don't)

**Do**
- Default everything to `font-mono` and override to `font-sans` / `font-serif` only where specified.
- Use the CSS variables; never hardcode `#f0f0e8` or `#2d5a2d` in components.
- Reach for `shadow-brutal` + `border-2 border-foreground` whenever a surface needs definition.
- Keep client `<script>` blocks small and vanilla.

**Don't**
- Use `rounded-*` utilities. Sharp corners only.
- Add `shadow-md`, `shadow-lg`, `shadow-xl`, or any soft Tailwind shadow. We have one shadow style: `shadow-brutal`.
- Sprinkle gradients. The palette is flat by design.
- Add an SPA framework or client-side router. Routes are real Astro pages.
- Introduce additional accent colors. Forest green is the only accent; semantic colors (destructive/warning/success) only when they actually mean something.

## Source-of-truth references

- Architecture: <https://github.com/ashleymcnamara/ashley.dev>
- Visual system: <https://github.com/pingdotgg/lawn> — especially `app/app.css` (tokens, fonts, animations) and `src/components/ui/button.tsx` (the brutal button recipe).

When in doubt: ashley.dev for *what goes where*, lawn for *how it looks*.

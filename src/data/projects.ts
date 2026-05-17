export interface Project {
  name: string;
  description: string;
  href?: string;
  tags: string[];
  year: number;
}

export const projects: Project[] = [
  {
    name: 'vitorsampa.io',
    description: 'This site. Astro + Tailwind, neo-brutalist visual system.',
    href: 'https://github.com/',
    tags: ['astro', 'tailwind'],
    year: 2026,
  },
];

// Manifesto content - converted from private/manifesto/v2/*.md

export type ManifestoPart = {
  slug: string;
  title: string;
  subtitle: string;
  prev: { slug: string; label: string } | null;
  next: { slug: string; label: string } | null;
};

export const MANIFESTO_PARTS: ManifestoPart[] = [
  {
    slug: 'problem',
    title: 'Part I: The Problem',
    subtitle: 'Why this matters.',
    prev: null,
    next: { slug: 'vision', label: 'Part II — The Vision' },
  },
  {
    slug: 'vision',
    title: 'Part II: The Vision',
    subtitle: 'What we believe.',
    prev: { slug: 'problem', label: 'Part I — The Problem' },
    next: { slug: 'architecture', label: 'Part III — The Architecture' },
  },
  {
    slug: 'architecture',
    title: 'Part III: The Architecture',
    subtitle: 'How it works.',
    prev: { slug: 'vision', label: 'Part II — The Vision' },
    next: { slug: 'stance', label: 'Part IV — The Stance' },
  },
  {
    slug: 'stance',
    title: 'Part IV: The Stance',
    subtitle: 'Where we stand.',
    prev: { slug: 'architecture', label: 'Part III — The Architecture' },
    next: { slug: 'invitation', label: 'Part V — The Invitation' },
  },
  {
    slug: 'invitation',
    title: 'Part V: The Invitation',
    subtitle: 'Join us.',
    prev: { slug: 'stance', label: 'Part IV — The Stance' },
    next: { slug: 'sources', label: 'Sources' },
  },
  {
    slug: 'sources',
    title: 'Sources',
    subtitle: 'Citation appendix for the DreamTree Manifesto.',
    prev: { slug: 'invitation', label: 'Part V — The Invitation' },
    next: null,
  },
];

export function getPartBySlug(slug: string): ManifestoPart | undefined {
  return MANIFESTO_PARTS.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] { // code_id:901
  return MANIFESTO_PARTS.map((p) => p.slug);
}

'use client';

import { useRouter } from 'next/navigation';
import { getPartBySlug } from '../content';
import {
  ProblemContent,
  VisionContent,
  ArchitectureContent,
  StanceContent,
  InvitationContent,
  SourcesContent,
} from '../parts';

const CONTENT_COMPONENTS: Record<string, React.ComponentType> = {
  problem: ProblemContent,
  vision: VisionContent,
  architecture: ArchitectureContent,
  stance: StanceContent,
  invitation: InvitationContent,
  sources: SourcesContent,
};

type Props = {
  slug: string;
};

export function ManifestoPartClient({ slug }: Props) { // code_id:898
  const router = useRouter();
  const part = getPartBySlug(slug);
  const ContentComponent = CONTENT_COMPONENTS[slug];

  if (!part || !ContentComponent) {
    return null;
  }

  return (
    <main className="about-main">
      <article className="about-content">
        <h1>{part.title}</h1>
        <p>
          <em>{part.subtitle}</em>
        </p>
        <hr />

        <ContentComponent />

        <hr />

        <nav
          style={{
            display: 'flex',
            justifyContent: part.prev ? 'space-between' : 'flex-end',
            gap: '1rem',
            marginTop: '2rem',
            flexWrap: 'wrap',
          }}
        >
          {part.prev && (
            <button
              className="button button-ghost"
              onClick={() => router.push(`/manifesto/${part.prev!.slug}`)}
            >
              ← Previous: {part.prev.label}
            </button>
          )}
          {part.next && (
            <button
              className="button button-primary"
              onClick={() => router.push(`/manifesto/${part.next!.slug}`)}
            >
              Next: {part.next.label} →
            </button>
          )}
        </nav>
      </article>
    </main>
  );
}

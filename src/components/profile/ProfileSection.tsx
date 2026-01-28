'use client';

import Link from 'next/link';
import { LockIcon } from '../icons';
import { ReactNode } from 'react';

interface ProfileSectionProps {
  title: string;
  editLink?: {
    label: string;
    to: string;
  };
  lockedUntil?: string | null;
  children: ReactNode;
}

export function ProfileSection({
  title,
  editLink,
  lockedUntil,
  children,
}: ProfileSectionProps) { // code_id:268
  const isLocked = !!lockedUntil;

  return (
    <section className="profile-section" data-locked={isLocked}>
      <header className="profile-section-header">
        <h2 className="profile-section-title">{title}</h2>
        {editLink && !isLocked && (
          <Link href={editLink.to} className="profile-section-edit">
            {editLink.label} →
          </Link>
        )}
      </header>

      {isLocked ? (
        <div className="profile-section-locked">
          <LockIcon width={20} height={20} aria-hidden="true" />
          <p>
            You&apos;ll unlock this in <strong>{lockedUntil}</strong>
          </p>
        </div>
      ) : (
        <div className="profile-section-content">{children}</div>
      )}
    </section>
  );
}

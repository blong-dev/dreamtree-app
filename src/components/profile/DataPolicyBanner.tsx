'use client';

import Link from 'next/link';
import { ShieldIcon } from '../icons';

export function DataPolicyBanner() { // code_id:266
  return (
    <div className="data-policy-banner">
      <ShieldIcon className="data-policy-icon" width={20} height={20} aria-hidden="true" />
      <p className="data-policy-text">
        Your data belongs to you. We never sell or share your information.
        You can download or delete everything at any time.
      </p>
      <Link href="/privacy" className="data-policy-link">
        Privacy Policy →
      </Link>
    </div>
  );
}

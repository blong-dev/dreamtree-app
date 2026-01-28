'use client';

import { WaitlistForm } from './WaitlistForm';

interface AnnouncementBannerProps {
  source?: string;
}

export function AnnouncementBanner({ source = 'banner' }: AnnouncementBannerProps) { // code_id:913
  return (
    <section className="landing-announcement">
      <div className="landing-announcement-content">
        <p className="landing-announcement-text">
          <span className="landing-announcement-icon">🌱</span>
          The workbook launches soon — get notified.
        </p>
        <WaitlistForm
          source={source}
          placeholder="your@email.com"
          buttonText="Notify Me"
          successMessage="You're on the list!"
        />
      </div>
    </section>
  );
}

'use client';

import { BreadcrumbLocation } from './types';

interface BreadcrumbProps {
  location: BreadcrumbLocation;
  onNavigate?: (location: Partial<BreadcrumbLocation>) => void;
}

export function Breadcrumb({ location, onNavigate }: BreadcrumbProps) { // code_id:275
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <button
            className="breadcrumb-link"
            onClick={() => onNavigate?.({ partId: location.partId })}
          >
            {location.partTitle}
          </button>
        </li>

        {location.moduleTitle && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              ›
            </li>
            <li className="breadcrumb-item">
              {location.exerciseTitle ? (
                <button
                  className="breadcrumb-link"
                  onClick={() =>
                    onNavigate?.({
                      partId: location.partId,
                      moduleId: location.moduleId,
                    })
                  }
                >
                  {location.moduleTitle}
                </button>
              ) : (
                <span className="breadcrumb-current" aria-current="location">
                  {location.moduleTitle}
                </span>
              )}
            </li>
          </>
        )}

        {location.exerciseTitle && (
          <>
            <li className="breadcrumb-separator" aria-hidden="true">
              ›
            </li>
            <li className="breadcrumb-item">
              <span className="breadcrumb-current" aria-current="location">
                {location.exerciseTitle}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}

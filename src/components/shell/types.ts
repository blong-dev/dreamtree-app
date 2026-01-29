export type NavItemId = 'home' | 'workbook' | 'contents' | 'tools' | 'profile';

export type InputType = 'text' | 'textarea' | 'structured' | 'none';

export type BreadcrumbLocation = {
  partId: string;
  partTitle: string;
  moduleId?: string;
  moduleTitle?: string;
  exerciseId?: string;
  exerciseTitle?: string;
};

export type ScrollState = 'at-current' | 'in-history';

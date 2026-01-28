// Navigation and TOC Types

export type ProgressStatus = 'locked' | 'available' | 'in-progress' | 'complete';

export type BreadcrumbLocation = {
  partId: string;
  partTitle: string;
  moduleId?: string;
  moduleTitle?: string;
  exerciseId?: string;
  exerciseTitle?: string;
};

export type ExerciseProgress = {
  id: string;
  title: string;
  status: ProgressStatus;
};

export type ModuleProgress = {
  id: string;
  title: string;
  status: ProgressStatus;
  exercises: ExerciseProgress[];
};

export type PartProgress = {
  id: string;
  title: string;
  status: ProgressStatus;
  percentComplete: number;
  modules: ModuleProgress[];
};

export type WorkbookProgress = {
  parts: PartProgress[];
};

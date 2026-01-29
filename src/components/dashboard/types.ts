// Dashboard Types

export type DailyDoType =
  | 'flow-tracking'
  | 'failure-reframe'
  | 'job-prospecting'
  | 'networking'
  | 'budget-check'
  | 'soared-prompt'
  | 'resume';

export type DailyDo = {
  id: string;
  type: DailyDoType;
  title: string;
  subtitle: string;
  action: {
    label: string;
    href: string;
  };
};

export type ProgressMetricData = {
  value: string | number;
  label: string;
};

export type BackgroundColorId =
  | 'ivory'
  | 'creamy-tan'
  | 'brown'
  | 'charcoal'
  | 'black';

export type FontFamilyId =
  | 'inter'
  | 'lora'
  | 'courier-prime'
  | 'shadows-into-light'
  | 'fleur-de-leah';

export type TextColorId =
  | 'ivory'
  | 'creamy-tan'
  | 'brown'
  | 'charcoal'
  | 'black';

export type UserPreview = {
  name: string;
  topSkills: {
    transferable: string | null;
    selfManagement: string | null;
    knowledge: string | null;
  };
  backgroundColor: BackgroundColorId;
  textColor: TextColorId;
  fontFamily: FontFamilyId;
  textSize: number;
};

// TOC Inline types (for dashboard)
export type TOCExerciseData = {
  id: string;
  title: string;
  status: 'locked' | 'available' | 'in-progress' | 'complete';
};

export type TOCModuleData = {
  id: string;
  title: string;
  status: 'locked' | 'available' | 'in-progress' | 'complete';
  exercises: TOCExerciseData[];
};

export type TOCPartData = {
  id: string;
  title: string;
  progress: number; // 0-100
  status: 'locked' | 'available' | 'in-progress' | 'complete';
  modules: TOCModuleData[];
};

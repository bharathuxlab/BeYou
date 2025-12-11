
export enum AppStage {
  SETUP = 'SETUP',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

export enum GoalCategory {
  FOCUS = 'FOCUS',
  CREATIVE = 'CREATIVE',
  CHORE = 'CHORE',
  LEARNING = 'LEARNING',
  REST = 'REST'
}

export interface TimerSession {
  durationMinutes: number;
  category: GoalCategory;
  intention: string;
  aiMotivation?: string;
  completedAt?: number; // Timestamp
}

export interface HistoryItem extends TimerSession {
  id: string;
}

export interface InterviewAnalysis {
  companyName: string;
  coreNeed: string;
  strongestMatch: string;
  gapToProbe: string;
}

export interface InterviewReport {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestedActions: string[];
  companyOverview?: string; // Markdown text from search
  companySources?: { title: string; uri: string }[];
}

export const CATEGORY_COLORS: Record<GoalCategory, string> = {
  [GoalCategory.FOCUS]: 'bg-ios-indigo text-white',
  [GoalCategory.CREATIVE]: 'bg-ios-pink text-white',
  [GoalCategory.CHORE]: 'bg-ios-orange text-white',
  [GoalCategory.LEARNING]: 'bg-ios-blue text-white',
  [GoalCategory.REST]: 'bg-ios-teal text-white',
};

export const CATEGORY_EMOJIS: Record<GoalCategory, string> = {
  [GoalCategory.FOCUS]: '🎯',
  [GoalCategory.CREATIVE]: '🎨',
  [GoalCategory.CHORE]: '🧹',
  [GoalCategory.LEARNING]: '📚',
  [GoalCategory.REST]: '🧘',
};

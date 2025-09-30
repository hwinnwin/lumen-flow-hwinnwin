// Chakra Color System for Chat Categorization

export const chakraCategories = {
  crown: {
    color: 'hsl(271 81% 56%)', // Violet - Strategic & Thinking
    label: 'Strategic & Thinking',
    description: 'Vision, strategy, big picture planning, philosophical discussions'
  },
  third_eye: {
    color: 'hsl(243 75% 59%)', // Indigo
    label: 'Research & Analysis',
    description: 'Insights, analysis, learning, research, deep understanding'
  },
  throat: {
    color: 'hsl(199 89% 48%)', // Blue
    label: 'Communication & Writing',
    description: 'Content creation, writing, expression, communication strategies'
  },
  heart: {
    color: 'hsl(142 71% 45%)', // Green
    label: 'Relationships & Growth',
    description: 'Personal development, healing, emotional work, relationships'
  },
  solar_plexus: {
    color: 'hsl(45 93% 47%)', // Yellow
    label: 'Action & Productivity',
    description: 'Tasks, execution, productivity, personal power, decisions'
  },
  sacral: {
    color: 'hsl(24 95% 53%)', // Orange
    label: 'Creative & Innovation',
    description: 'Creativity, innovation, new ideas, experiments, passion projects'
  },
  root: {
    color: 'hsl(0 84% 60%)', // Red
    label: 'Foundation & Systems',
    description: 'Basic needs, structure, systems, technical implementation, security'
  },
  uncategorized: {
    color: 'hsl(240 5% 65%)', // Gray
    label: 'Miscellaneous',
    description: 'Uncategorized or general discussions'
  }
} as const;

export type ChakraCategory = keyof typeof chakraCategories;

export const priorityColors = {
  low: 'hsl(142 71% 45%)', // Green
  medium: 'hsl(45 93% 47%)', // Orange/Yellow
  high: 'hsl(0 84% 60%)' // Red
} as const;

export type Priority = keyof typeof priorityColors;

export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'For Review' },
  { value: 'reference', label: 'Reference' },
  { value: 'completed', label: 'Completed' }
] as const;

export type Status = 'active' | 'review' | 'reference' | 'completed';

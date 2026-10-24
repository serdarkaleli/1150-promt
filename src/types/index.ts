export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface PromptVersion {
  version: number;
  timestamp: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  change_summary?: string;
}

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  copy_count: number;
  created_at: string;
  updated_at: string;
  last_copied_at?: string;
  history?: PromptVersion[];
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PromptCreateInput {
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite?: boolean;
}

export interface PromptUpdateInput extends Partial<PromptCreateInput> {}

export interface LibraryCategoryStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
  totalCopies: number;
  favoriteCount: number;
  fillableCount: number;
  copyShare: number;
  favoriteRate: number;
  favoriteShare: number;
  avgCopiesPerPrompt: number;
  topPromptTitle?: string;
  topPromptCopies?: number;
}

export interface LibraryTagStat {
  tag: string;
  count: number;
  percentage: number;
  totalCopies: number;
  favoriteCount: number;
  fillableCount: number;
  copyShare: number;
  favoriteRate: number;
  favoriteShare: number;
  avgCopiesPerPrompt: number;
  topPromptTitle?: string;
  topPromptCopies?: number;
}

export interface TopPromptStat {
  id: string;
  rank: number;
  title: string;
  shortTitle: string;
  category: string;
  copy_count: number;
  percentageOfTop: number;
  shareOfTotalCopies: number;
  is_favorite: boolean;
  color: string;
}

export interface CopyTrendPoint {
  period: string;
  prompt_1?: number;
  prompt_2?: number;
  prompt_3?: number;
  prompt_4?: number;
  prompt_5?: number;
  total: number;
}

export interface LibraryStats {
  totalPrompts: number;
  totalCopies: number;
  favoriteCount: number;
  fillableCount: number;
  totalCategories: number;
  categoryDistribution: LibraryCategoryStat[];
  popularTags: LibraryTagStat[];
  topPrompts: TopPromptStat[];
  copyTrend: CopyTrendPoint[];
  estimatedTotalWords: number;
}

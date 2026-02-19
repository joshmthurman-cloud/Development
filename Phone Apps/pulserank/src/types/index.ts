export type KnowledgeLevel =
  | 'layperson'
  | 'emt'
  | 'nurse_ma'
  | 'pharmacist'
  | 'physician_np_pa';

export type ConnectionStatus = 'pending' | 'accepted';

export interface Profile {
  id: string;
  username: string;
  tier: KnowledgeLevel;
  focus_topics: string[];
  avoid_topics: string[];
  notify_daily_quiz: boolean;
  notify_poll: boolean;
  notify_reminders: boolean;
  quiz_streak: number;
  poll_streak: number;
  accuracy_streak: number;
  best_accuracy_streak: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  tier: KnowledgeLevel;
  topic: string;
  difficulty: number;
  question_text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  wrong_explanations: Record<string, string> | null;
  is_poll_eligible: boolean;
}

export interface DailyQuizAssignment {
  id: string;
  user_id: string;
  question_id: string;
  quiz_date: string;
  question_order: number;
  question?: Question;
}

export interface QuizAnswer {
  id: string;
  user_id: string;
  question_id: string;
  assignment_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface PollQuestion {
  id: string;
  question_id: string;
  poll_date: string;
  opens_at: string;
  closes_at: string;
  question?: Question;
}

export interface PollAnswer {
  id: string;
  user_id: string;
  poll_question_id: string;
  selected_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface PollStats {
  total_answers: number;
  correct_count: number;
  incorrect_count: number;
  correct_percentage: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'accuracy_streak' | 'poll_participation' | 'daily_completion';
  icon_name: string;
  threshold: number;
  is_repeatable: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earn_count: number;
  first_earned_at: string;
  last_earned_at: string;
  badge?: Badge;
}

export interface SocialConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface LeaderboardEntry {
  user_id: string;
  tier: KnowledgeLevel;
  period: '7d' | '30d';
  score: number;
  rank: number;
  username?: string;
}

export interface DailyQuizStatus {
  quiz_date: string;
  total_questions: number;
  answered_count: number;
  correct_count: number;
  is_complete: boolean;
}

export type QuizState = 'locked' | 'available' | 'in_progress' | 'completed';
export type PollState = 'upcoming' | 'live' | 'answered' | 'closed';

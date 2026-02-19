-- Pulse Rank Database Schema
-- Run this in Supabase SQL Editor to set up all tables

-- ENUMS
CREATE TYPE tier_level AS ENUM (
  'layperson', 'emt', 'nurse_ma', 'pharmacist', 'physician_np_pa'
);

CREATE TYPE connection_status AS ENUM (
  'pending', 'accepted'
);

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  tier tier_level DEFAULT NULL,
  focus_topics TEXT[] DEFAULT '{}',
  avoid_topics TEXT[] DEFAULT '{}',
  notify_daily_quiz BOOLEAN DEFAULT true,
  notify_poll BOOLEAN DEFAULT true,
  notify_reminders BOOLEAN DEFAULT true,
  quiz_streak INTEGER DEFAULT 0,
  poll_streak INTEGER DEFAULT 0,
  accuracy_streak INTEGER DEFAULT 0,
  best_accuracy_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- QUESTIONS (bank)
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier tier_level NOT NULL,
  topic TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  wrong_explanations JSONB,
  is_poll_eligible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DAILY QUIZ ASSIGNMENTS
CREATE TABLE daily_quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  quiz_date DATE NOT NULL,
  question_order INTEGER NOT NULL CHECK (question_order BETWEEN 1 AND 5),
  UNIQUE(user_id, quiz_date, question_order),
  UNIQUE(user_id, question_id)
);

-- QUIZ ANSWERS
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  assignment_id UUID NOT NULL REFERENCES daily_quiz_assignments(id),
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, assignment_id)
);

-- POLL QUESTIONS (one per day)
CREATE TABLE poll_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  poll_date DATE NOT NULL UNIQUE,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- POLL ANSWERS
CREATE TABLE poll_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poll_question_id UUID NOT NULL REFERENCES poll_questions(id),
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, poll_question_id)
);

-- BADGES CATALOG
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  is_repeatable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- USER BADGES (earned)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  earn_count INTEGER DEFAULT 1,
  first_earned_at TIMESTAMPTZ DEFAULT now(),
  last_earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- SOCIAL CONNECTIONS
CREATE TABLE social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status connection_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- DEVICE TOKENS (push notifications)
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

-- LEADERBOARD CACHE
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier tier_level NOT NULL,
  period TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  rank INTEGER,
  computed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tier, period)
);

-- INDEXES
CREATE INDEX idx_questions_tier_topic ON questions(tier, topic);
CREATE INDEX idx_daily_quiz_user_date ON daily_quiz_assignments(user_id, quiz_date);
CREATE INDEX idx_quiz_answers_user ON quiz_answers(user_id);
CREATE INDEX idx_poll_questions_date ON poll_questions(poll_date);
CREATE INDEX idx_poll_answers_poll ON poll_answers(poll_question_id);
CREATE INDEX idx_leaderboard_tier_period ON leaderboard_cache(tier, period, score DESC);
CREATE INDEX idx_social_connections_users ON social_connections(requester_id, addressee_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::text, 8))
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS POLICIES: questions
CREATE POLICY "Questions readable by authenticated"
  ON questions FOR SELECT TO authenticated USING (true);

-- RLS POLICIES: daily_quiz_assignments
CREATE POLICY "Users see own assignments"
  ON daily_quiz_assignments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert assignments"
  ON daily_quiz_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS POLICIES: quiz_answers
CREATE POLICY "Users see own answers"
  ON quiz_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can submit answers"
  ON quiz_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS POLICIES: poll_questions
CREATE POLICY "Poll questions readable by authenticated"
  ON poll_questions FOR SELECT TO authenticated USING (true);

-- RLS POLICIES: poll_answers
CREATE POLICY "Users see own poll answers"
  ON poll_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can submit poll answer"
  ON poll_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS POLICIES: badges
CREATE POLICY "Badge catalog readable by all"
  ON badges FOR SELECT TO authenticated USING (true);

-- RLS POLICIES: user_badges
CREATE POLICY "User badges viewable by all authenticated"
  ON user_badges FOR SELECT TO authenticated USING (true);

-- RLS POLICIES: social_connections
CREATE POLICY "Users see own connections"
  ON social_connections FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can send requests"
  ON social_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own connections"
  ON social_connections FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "Users can delete own connections"
  ON social_connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS POLICIES: device_tokens
CREATE POLICY "Users manage own tokens"
  ON device_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- RLS POLICIES: leaderboard_cache
CREATE POLICY "Leaderboard viewable by all"
  ON leaderboard_cache FOR SELECT TO authenticated USING (true);

-- SEED: Badge catalog
INSERT INTO badges (id, name, description, category, icon_name, threshold, is_repeatable) VALUES
  ('pinpoint_x5', 'Pinpoint x5', '5 correct answers in a row', 'accuracy_streak', 'target', 5, true),
  ('clinical_flow_x10', 'Clinical Flow x10', '10 correct answers in a row', 'accuracy_streak', 'trending-up', 10, true),
  ('attending_mode_x20', 'Attending Mode x20', '20 correct answers in a row', 'accuracy_streak', 'star-circle', 20, true),
  ('poll_regular_3d', 'Poll Regular', 'Participate in the poll 3 days in a row', 'poll_participation', 'chart-bar', 3, true),
  ('poll_committed_10d', 'Poll Committed', 'Participate in the poll 10 days in a row', 'poll_participation', 'chart-timeline-variant', 10, true),
  ('poll_veteran_20d', 'Poll Veteran', 'Participate in the poll 20 days in a row', 'poll_participation', 'medal', 20, true),
  ('daily_five_5d', 'Daily Five', 'Complete all 5 questions, 5 days in a row', 'daily_completion', 'calendar-check', 5, true),
  ('daily_discipline_10d', 'Daily Discipline', 'Complete all 5 questions, 10 days in a row', 'daily_completion', 'shield-check', 10, true),
  ('daily_machine_20d', 'Daily Machine', 'Complete all 5 questions, 20 days in a row', 'daily_completion', 'rocket-launch', 20, true);

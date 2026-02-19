import { supabase } from '@/lib/supabase';
import type { PollQuestion, PollAnswer, PollStats } from '@/types';

export async function fetchTodayPoll(
  date: string
): Promise<PollQuestion | null> {
  const { data, error } = await supabase
    .from('poll_questions')
    .select('*, question:questions(*)')
    .eq('poll_date', date)
    .maybeSingle();

  if (error) throw error;
  return (data as PollQuestion) ?? null;
}

export async function submitPollAnswer(
  userId: string,
  pollQuestionId: string,
  selectedIndex: number,
  correctIndex: number
): Promise<PollAnswer> {
  const { data, error } = await supabase
    .from('poll_answers')
    .insert({
      user_id: userId,
      poll_question_id: pollQuestionId,
      selected_index: selectedIndex,
      is_correct: selectedIndex === correctIndex,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PollAnswer;
}

export async function fetchPollStats(
  pollQuestionId: string
): Promise<PollStats> {
  const { data, error } = await supabase
    .from('poll_answers')
    .select('is_correct')
    .eq('poll_question_id', pollQuestionId);

  if (error) throw error;

  const answers = data ?? [];
  const total = answers.length;
  const correct = answers.filter((a) => a.is_correct).length;

  return {
    total_answers: total,
    correct_count: correct,
    incorrect_count: total - correct,
    correct_percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

export async function fetchMyPollAnswer(
  userId: string,
  pollQuestionId: string
): Promise<PollAnswer | null> {
  const { data } = await supabase
    .from('poll_answers')
    .select('*')
    .eq('user_id', userId)
    .eq('poll_question_id', pollQuestionId)
    .maybeSingle();

  return (data as PollAnswer) ?? null;
}

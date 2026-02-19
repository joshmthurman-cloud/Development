import { supabase } from '@/lib/supabase';
import type { DailyQuizAssignment, QuizAnswer, DailyQuizStatus } from '@/types';

export async function fetchDailyQuiz(
  userId: string,
  date: string
): Promise<DailyQuizAssignment[]> {
  const { data, error } = await supabase
    .from('daily_quiz_assignments')
    .select('*, question:questions(*)')
    .eq('user_id', userId)
    .eq('quiz_date', date)
    .order('question_order');

  if (error) throw error;
  return (data ?? []) as DailyQuizAssignment[];
}

export async function submitAnswer(
  userId: string,
  assignmentId: string,
  questionId: string,
  selectedIndex: number,
  correctIndex: number
): Promise<QuizAnswer> {
  const isCorrect = selectedIndex === correctIndex;

  const { data, error } = await supabase
    .from('quiz_answers')
    .insert({
      user_id: userId,
      assignment_id: assignmentId,
      question_id: questionId,
      selected_index: selectedIndex,
      is_correct: isCorrect,
    })
    .select()
    .single();

  if (error) throw error;
  return data as QuizAnswer;
}

export async function fetchQuizStatus(
  userId: string,
  date: string
): Promise<DailyQuizStatus> {
  const { data: assignments } = await supabase
    .from('daily_quiz_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_date', date);

  const { data: answers } = await supabase
    .from('quiz_answers')
    .select('is_correct')
    .eq('user_id', userId)
    .in(
      'assignment_id',
      (assignments ?? []).map((a) => a.id)
    );

  const total = assignments?.length ?? 0;
  const answered = answers?.length ?? 0;
  const correct = answers?.filter((a) => a.is_correct).length ?? 0;

  return {
    quiz_date: date,
    total_questions: total,
    answered_count: answered,
    correct_count: correct,
    is_complete: answered >= total && total > 0,
  };
}

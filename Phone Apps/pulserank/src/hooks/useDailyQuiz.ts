import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchDailyQuiz, submitAnswer, fetchQuizStatus } from '@/api/quiz';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function useDailyQuiz() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = getToday();

  return useQuery({
    queryKey: ['daily-quiz', today],
    queryFn: () => fetchDailyQuiz(userId!, today),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useQuizStatus() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = getToday();

  return useQuery({
    queryKey: ['daily-quiz-status', today],
    queryFn: () => fetchQuizStatus(userId!, today),
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = getToday();

  return useMutation({
    mutationFn: (params: {
      assignmentId: string;
      questionId: string;
      selectedIndex: number;
      correctIndex: number;
    }) =>
      submitAnswer(
        userId!,
        params.assignmentId,
        params.questionId,
        params.selectedIndex,
        params.correctIndex
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-quiz-status', today] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchTodayPoll,
  submitPollAnswer,
  fetchPollStats,
  fetchMyPollAnswer,
} from '@/api/poll';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function useTodayPoll() {
  const today = getToday();

  return useQuery({
    queryKey: ['poll', today],
    queryFn: () => fetchTodayPoll(today),
    staleTime: 1000 * 60,
  });
}

export function usePollStats(pollQuestionId: string | undefined) {
  return useQuery({
    queryKey: ['poll-stats', pollQuestionId],
    queryFn: () => fetchPollStats(pollQuestionId!),
    enabled: !!pollQuestionId,
    refetchInterval: 10000,
  });
}

export function useMyPollAnswer(pollQuestionId: string | undefined) {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['poll-answer', pollQuestionId, userId],
    queryFn: () => fetchMyPollAnswer(userId!, pollQuestionId!),
    enabled: !!userId && !!pollQuestionId,
  });
}

export function useSubmitPollAnswer() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = getToday();

  return useMutation({
    mutationFn: (params: {
      pollQuestionId: string;
      selectedIndex: number;
      correctIndex: number;
    }) =>
      submitPollAnswer(
        userId!,
        params.pollQuestionId,
        params.selectedIndex,
        params.correctIndex
      ),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['poll-stats', vars.pollQuestionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['poll-answer', vars.pollQuestionId, userId],
      });
      queryClient.invalidateQueries({ queryKey: ['poll', today] });
    },
  });
}

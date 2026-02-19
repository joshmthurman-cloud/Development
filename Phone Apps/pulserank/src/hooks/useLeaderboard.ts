import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchLeaderboard, fetchMyRank } from '@/api/leaderboard';
import type { KnowledgeLevel } from '@/types';

export function useLeaderboard(tier: KnowledgeLevel, period: '7d' | '30d') {
  return useQuery({
    queryKey: ['leaderboard', tier, period],
    queryFn: () => fetchLeaderboard(tier, period),
    staleTime: 1000 * 60 * 2,
  });
}

export function useMyRank(tier: KnowledgeLevel, period: '7d' | '30d') {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['leaderboard-me', tier, period],
    queryFn: () => fetchMyRank(userId!, tier, period),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

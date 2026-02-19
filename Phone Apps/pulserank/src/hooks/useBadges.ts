import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchMyBadges, fetchUserBadges } from '@/api/badges';

export function useMyBadges() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['badges', userId],
    queryFn: () => fetchMyBadges(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['badges', userId],
    queryFn: () => fetchUserBadges(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

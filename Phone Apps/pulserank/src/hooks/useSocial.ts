import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchConnections,
  fetchPendingRequests,
  sendFriendRequest,
  acceptRequest,
  removeConnection,
  searchUsers,
  fetchPublicProfile,
} from '@/api/social';

export function useConnections() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['connections', userId],
    queryFn: () => fetchConnections(userId!),
    enabled: !!userId,
  });
}

export function usePendingRequests() {
  const userId = useAuthStore((s) => s.session?.user.id);

  return useQuery({
    queryKey: ['requests', userId],
    queryFn: () => fetchPendingRequests(userId!),
    enabled: !!userId,
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: () => searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 10,
  });
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfile(username),
    enabled: !!username,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: (addresseeId: string) =>
      sendFriendRequest(userId!, addresseeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });
}

export function useAcceptRequest() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: (connectionId: string) => acceptRequest(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', userId] });
      queryClient.invalidateQueries({ queryKey: ['requests', userId] });
    },
  });
}

export function useRemoveConnection() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  return useMutation({
    mutationFn: (connectionId: string) => removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections', userId] });
    },
  });
}

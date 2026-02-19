import { supabase } from '@/lib/supabase';
import type { SocialConnection, Profile } from '@/types';

export async function searchUsers(query: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(20);

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<void> {
  const { error } = await supabase.from('social_connections').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptRequest(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('social_connections')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', connectionId);
  if (error) throw error;
}

export async function removeConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('social_connections')
    .delete()
    .eq('id', connectionId);
  if (error) throw error;
}

export async function fetchConnections(
  userId: string
): Promise<SocialConnection[]> {
  const { data, error } = await supabase
    .from('social_connections')
    .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) throw error;
  return (data ?? []) as SocialConnection[];
}

export async function fetchPendingRequests(
  userId: string
): Promise<SocialConnection[]> {
  const { data, error } = await supabase
    .from('social_connections')
    .select('*, requester:profiles!requester_id(*)')
    .eq('addressee_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return (data ?? []) as SocialConnection[];
}

export async function fetchPublicProfile(
  username: string
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  return (data as Profile) ?? null;
}

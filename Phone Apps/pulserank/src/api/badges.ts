import { supabase } from '@/lib/supabase';
import type { UserBadge } from '@/types';

export async function fetchMyBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

export async function fetchUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

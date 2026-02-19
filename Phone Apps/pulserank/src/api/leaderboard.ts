import { supabase } from '@/lib/supabase';
import type { LeaderboardEntry, KnowledgeLevel } from '@/types';

export async function fetchLeaderboard(
  tier: KnowledgeLevel,
  period: '7d' | '30d' = '7d',
  limit = 50
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('*, profile:profiles(username)')
    .eq('tier', tier)
    .eq('period', period)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    tier: row.tier,
    period: row.period,
    score: Number(row.score),
    rank: row.rank,
    username: row.profile?.username ?? 'Unknown',
  }));
}

export async function fetchMyRank(
  userId: string,
  tier: KnowledgeLevel,
  period: '7d' | '30d' = '7d'
): Promise<LeaderboardEntry | null> {
  const { data } = await supabase
    .from('leaderboard_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('tier', tier)
    .eq('period', period)
    .maybeSingle();

  if (!data) return null;

  return {
    user_id: data.user_id,
    tier: data.tier,
    period: data.period,
    score: Number(data.score),
    rank: data.rank,
  };
}

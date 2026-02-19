import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, KnowledgeLevel } from '@/types';

const ONBOARDED_KEY = 'pulserank_onboarded';

async function getPersistedOnboarded(userId: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(`${ONBOARDED_KEY}_${userId}`);
    return val === 'true';
  } catch {
    return false;
  }
}

async function setPersistedOnboarded(userId: string, value: boolean) {
  try {
    if (value) {
      await AsyncStorage.setItem(`${ONBOARDED_KEY}_${userId}`, 'true');
    } else {
      await AsyncStorage.removeItem(`${ONBOARDED_KEY}_${userId}`);
    }
  } catch {}
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;

  signUp: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error: string | null }>;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;

  signOut: () => Promise<void>;

  refreshProfile: () => Promise<void>;

  updateProfile: (
    updates: Partial<
      Pick<
        Profile,
        | 'tier'
        | 'focus_topics'
        | 'avoid_topics'
        | 'notify_daily_quiz'
        | 'notify_poll'
        | 'notify_reminders'
      >
    >
  ) => Promise<{ error: string | null }>;

  completeOnboarding: (
    tier: KnowledgeLevel,
    focusTopics: string[],
    avoidTopics: string[]
  ) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) =>
    set({
      profile,
      isOnboarded: profile?.tier != null,
    }),

  signUp: async (email, password, username) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  },

  signOut: async () => {
    const session = get().session;
    if (session) {
      await setPersistedOnboarded(session.user.id, false);
    }
    await supabase.auth.signOut();
    set({ session: null, profile: null, isOnboarded: false });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;

    const persisted = await getPersistedOnboarded(session.user.id);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      const onboarded = data.tier != null || persisted;
      if (onboarded && !persisted) {
        await setPersistedOnboarded(session.user.id, true);
      }
      set({
        profile: data as Profile,
        isOnboarded: onboarded,
        isLoading: false,
      });
    } else {
      set({ isOnboarded: persisted, isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const session = get().session;
    if (!session) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) return { error: error.message };
    await get().refreshProfile();
    return { error: null };
  },

  completeOnboarding: async (tier, focusTopics, avoidTopics) => {
    const session = get().session;
    const result = await get().updateProfile({
      tier,
      focus_topics: focusTopics,
      avoid_topics: avoidTopics,
    });
    if (!result.error) {
      if (session) {
        await setPersistedOnboarded(session.user.id, true);
      }
      set({ isOnboarded: true });
    }
    return result;
  },
}));

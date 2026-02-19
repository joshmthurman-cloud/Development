import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DailyQuizAssignment, QuizAnswer } from '@/types';

const QUIZ_STATE_KEY = 'pulserank_quiz_state';

interface QuizSessionState {
  assignments: DailyQuizAssignment[];
  answers: QuizAnswer[];
  currentIndex: number;
  quizDate: string | null;

  setAssignments: (assignments: DailyQuizAssignment[]) => void;
  addAnswer: (answer: QuizAnswer) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
  restoreState: () => Promise<void>;
  persistState: () => Promise<void>;
}

export const useQuizStore = create<QuizSessionState>((set, get) => ({
  assignments: [],
  answers: [],
  currentIndex: 0,
  quizDate: null,

  setAssignments: (assignments) => {
    const today = new Date().toISOString().split('T')[0];
    set({ assignments, quizDate: today });
    get().persistState();
  },

  addAnswer: (answer) => {
    set((state) => ({ answers: [...state.answers, answer] }));
    get().persistState();
  },

  nextQuestion: () => {
    set((state) => ({ currentIndex: state.currentIndex + 1 }));
    get().persistState();
  },

  resetQuiz: () => {
    set({ assignments: [], answers: [], currentIndex: 0, quizDate: null });
    AsyncStorage.removeItem(QUIZ_STATE_KEY);
  },

  restoreState: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUIZ_STATE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const today = new Date().toISOString().split('T')[0];
      if (saved.quizDate === today) {
        set({
          assignments: saved.assignments ?? [],
          answers: saved.answers ?? [],
          currentIndex: saved.currentIndex ?? 0,
          quizDate: saved.quizDate,
        });
      } else {
        AsyncStorage.removeItem(QUIZ_STATE_KEY);
      }
    } catch {
      // Silently fail -- fresh state is fine
    }
  },

  persistState: async () => {
    const { assignments, answers, currentIndex, quizDate } = get();
    try {
      await AsyncStorage.setItem(
        QUIZ_STATE_KEY,
        JSON.stringify({ assignments, answers, currentIndex, quizDate })
      );
    } catch {
      // Best-effort persistence
    }
  },
}));

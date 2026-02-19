import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useQuizStore } from '@/stores/quizStore';
import { useDailyQuiz, useSubmitAnswer } from '@/hooks/useDailyQuiz';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { AnswerOption } from '@/components/quiz/AnswerOption';
import { ExplanationCard } from '@/components/quiz/ExplanationCard';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { colors, spacing, radius } from '@/theme';

export default function QuizScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: assignments, isLoading } = useDailyQuiz();
  const submitAnswer = useSubmitAnswer();

  const {
    currentIndex,
    answers,
    setAssignments,
    addAnswer,
    nextQuestion,
    restoreState,
  } = useQuizStore();

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);

  useEffect(() => {
    restoreState();
  }, []);

  useEffect(() => {
    if (assignments && assignments.length > 0) {
      setAssignments(assignments);
    }
  }, [assignments]);

  useEffect(() => {
    setSelectedIndex(null);
    setIsRevealed(false);
    setCurrentAnswer(null);
  }, [currentIndex]);

  const assignment = assignments?.[currentIndex];
  const question = assignment?.question;
  const isComplete = currentIndex >= (assignments?.length ?? 5);
  const alreadyAnswered = answers.find(
    (a) => a.assignment_id === assignment?.id
  );

  useEffect(() => {
    if (alreadyAnswered) {
      setSelectedIndex(alreadyAnswered.selected_index);
      setIsRevealed(true);
      setCurrentAnswer(alreadyAnswered);
    }
  }, [alreadyAnswered, currentIndex]);

  const handleSelect = useCallback(
    async (index: number) => {
      if (isRevealed || !assignment || !question) return;

      setSelectedIndex(index);
      setIsRevealed(true);

      try {
        const result = await submitAnswer.mutateAsync({
          assignmentId: assignment.id,
          questionId: question.id,
          selectedIndex: index,
          correctIndex: question.correct_index,
        });
        setCurrentAnswer(result);
        addAnswer(result);
      } catch {
        // Answer saved locally via store even if network fails
      }
    },
    [isRevealed, assignment, question]
  );

  if (isLoading) return <LoadingScreen message="Loading quiz..." />;

  if (isComplete) {
    const correctCount = answers.filter((a) => a.is_correct).length;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text variant="displaySmall" style={styles.scoreText}>
              {correctCount}/{assignments?.length ?? 5}
            </Text>
            <Text style={styles.summaryLabel}>Today's Score</Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {Math.round(
                  (correctCount / (assignments?.length ?? 5)) * 100
                )}
                %
              </Text>
              <Text style={styles.summaryStatLabel}>Accuracy</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {profile?.quiz_streak ?? 0}
              </Text>
              <Text style={styles.summaryStatLabel}>Day Streak</Text>
            </View>
          </View>

          <Button
            mode="contained"
            onPress={() => router.back()}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            style={styles.doneButton}
            contentStyle={styles.doneButtonContent}
            labelStyle={styles.doneButtonLabel}
          >
            Done
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!question) return <LoadingScreen message="Preparing questions..." />;

  const wrongExplanation =
    isRevealed &&
    selectedIndex !== null &&
    selectedIndex !== question.correct_index &&
    question.wrong_explanations
      ? question.wrong_explanations[String(selectedIndex)]
      : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <IconButton
          icon="close"
          iconColor={colors.textMuted}
          onPress={() => router.back()}
        />
        <Text style={styles.questionCount}>
          Question {currentIndex + 1} of {assignments?.length ?? 5}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <QuizProgress
        total={assignments?.length ?? 5}
        current={currentIndex}
        answered={answers.length}
      />

      <ScrollView
        contentContainerStyle={styles.questionScroll}
        showsVerticalScrollIndicator={false}
      >
        <QuestionCard
          questionNumber={currentIndex + 1}
          totalQuestions={assignments?.length ?? 5}
          topic={question.topic}
          questionText={question.question_text}
        />

        <View style={styles.answers}>
          {question.choices.map((choice: string, i: number) => (
            <AnswerOption
              key={i}
              index={i}
              text={choice}
              isSelected={selectedIndex === i}
              isCorrect={currentAnswer?.is_correct}
              isRevealed={isRevealed}
              correctIndex={question.correct_index}
              onPress={() => handleSelect(i)}
            />
          ))}
        </View>

        {isRevealed && (
          <View style={styles.explanationWrap}>
            <ExplanationCard
              isCorrect={selectedIndex === question.correct_index}
              explanation={question.explanation}
              wrongExplanation={wrongExplanation}
            />

            <Button
              mode="contained"
              onPress={nextQuestion}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              style={styles.nextButton}
              contentStyle={styles.nextButtonContent}
              labelStyle={styles.nextButtonLabel}
            >
              {currentIndex + 1 >= (assignments?.length ?? 5)
                ? 'See Results'
                : 'Next Question'}
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  questionCount: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  questionScroll: {
    paddingBottom: spacing.xxxl,
  },
  answers: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  explanationWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  nextButton: { borderRadius: radius.md },
  nextButtonContent: { paddingVertical: spacing.sm },
  nextButtonLabel: { fontSize: 16, fontWeight: '700' },
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.xxxl,
  },
  summaryHeader: { alignItems: 'center', gap: spacing.sm },
  scoreText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 64,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: { color: colors.textSecondary, fontSize: 16 },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  summaryStatItem: { alignItems: 'center', gap: 4 },
  summaryStatValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryStatLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  doneButton: { borderRadius: radius.md, width: '100%' },
  doneButtonContent: { paddingVertical: spacing.sm },
  doneButtonLabel: { fontSize: 16, fontWeight: '700' },
});

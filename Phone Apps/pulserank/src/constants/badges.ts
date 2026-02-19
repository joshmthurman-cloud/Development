import type { Badge } from '@/types';

export const BADGE_CATALOG: Badge[] = [
  {
    id: 'pinpoint_x5',
    name: 'Pinpoint x5',
    description: '5 correct answers in a row',
    category: 'accuracy_streak',
    icon_name: 'target',
    threshold: 5,
    is_repeatable: true,
  },
  {
    id: 'clinical_flow_x10',
    name: 'Clinical Flow x10',
    description: '10 correct answers in a row',
    category: 'accuracy_streak',
    icon_name: 'trending-up',
    threshold: 10,
    is_repeatable: true,
  },
  {
    id: 'attending_mode_x20',
    name: 'Attending Mode x20',
    description: '20 correct answers in a row',
    category: 'accuracy_streak',
    icon_name: 'star-circle',
    threshold: 20,
    is_repeatable: true,
  },
  {
    id: 'poll_regular_3d',
    name: 'Poll Regular',
    description: 'Participate in the live poll 3 days in a row',
    category: 'poll_participation',
    icon_name: 'chart-bar',
    threshold: 3,
    is_repeatable: true,
  },
  {
    id: 'poll_committed_10d',
    name: 'Poll Committed',
    description: 'Participate in the live poll 10 days in a row',
    category: 'poll_participation',
    icon_name: 'chart-timeline-variant',
    threshold: 10,
    is_repeatable: true,
  },
  {
    id: 'poll_veteran_20d',
    name: 'Poll Veteran',
    description: 'Participate in the live poll 20 days in a row',
    category: 'poll_participation',
    icon_name: 'medal',
    threshold: 20,
    is_repeatable: true,
  },
  {
    id: 'daily_five_5d',
    name: 'Daily Five',
    description: 'Complete all 5 daily questions, 5 days in a row',
    category: 'daily_completion',
    icon_name: 'calendar-check',
    threshold: 5,
    is_repeatable: true,
  },
  {
    id: 'daily_discipline_10d',
    name: 'Daily Discipline',
    description: 'Complete all 5 daily questions, 10 days in a row',
    category: 'daily_completion',
    icon_name: 'shield-check',
    threshold: 10,
    is_repeatable: true,
  },
  {
    id: 'daily_machine_20d',
    name: 'Daily Machine',
    description: 'Complete all 5 daily questions, 20 days in a row',
    category: 'daily_completion',
    icon_name: 'rocket-launch',
    threshold: 20,
    is_repeatable: true,
  },
];

export const BADGE_MAP = Object.fromEntries(
  BADGE_CATALOG.map((b) => [b.id, b])
) as Record<string, Badge>;

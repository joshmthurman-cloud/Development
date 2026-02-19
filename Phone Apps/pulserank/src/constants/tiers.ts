import type { KnowledgeLevel } from '@/types';

export interface TierInfo {
  key: KnowledgeLevel;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: string;
}

export const TIERS: Record<KnowledgeLevel, TierInfo> = {
  layperson: {
    key: 'layperson',
    label: 'Layperson / Beginner',
    shortLabel: 'Layperson',
    description:
      'Tailored to individuals with little to no formal medical background. Perfect for those curious about health basics.',
    color: '#14B8A6',
    icon: 'book-open-variant',
  },
  emt: {
    key: 'emt',
    label: 'EMT',
    shortLabel: 'EMT',
    description:
      'Designed for pre-hospital providers. Questions focus on emergency care, trauma, and rapid assessment.',
    color: '#F97316',
    icon: 'ambulance',
  },
  nurse_ma: {
    key: 'nurse_ma',
    label: 'Nurse / Medical Assistant',
    shortLabel: 'Nurse/MA',
    description:
      'Suited for nursing students, practicing nurses, or medical assistants. Covers clinical care and patient interaction.',
    color: '#3B82F6',
    icon: 'heart-pulse',
  },
  pharmacist: {
    key: 'pharmacist',
    label: 'Pharmacist',
    shortLabel: 'Pharmacist',
    description:
      'Targeted at pharmacy students or practicing pharmacists. Questions focus on medications, interactions, and therapeutics.',
    color: '#A855F7',
    icon: 'pill',
  },
  physician_np_pa: {
    key: 'physician_np_pa',
    label: 'Physician / PA',
    shortLabel: 'Physician/PA',
    description:
      'Aimed at medical students, PAs, or physicians. Challenges focus on diagnostics, complex cases, and clinical decisions.',
    color: '#EF4444',
    icon: 'stethoscope',
  },
};

export const TIER_LIST: TierInfo[] = Object.values(TIERS);

export interface TopicInfo {
  key: string;
  label: string;
  icon: string;
}

export const TOPICS: TopicInfo[] = [
  { key: 'cardiology', label: 'Cardiology', icon: 'heart' },
  { key: 'pharmacology', label: 'Pharmacology', icon: 'pill' },
  { key: 'genetics', label: 'Genetics', icon: 'dna' },
  { key: 'neurology', label: 'Neurology', icon: 'brain' },
  { key: 'respiratory', label: 'Respiratory', icon: 'lungs' },
  { key: 'trauma', label: 'Trauma & Emergency', icon: 'ambulance' },
  { key: 'infectious', label: 'Infectious Disease', icon: 'virus' },
  { key: 'endocrine', label: 'Endocrine', icon: 'water' },
  { key: 'gi', label: 'Gastrointestinal', icon: 'stomach' },
  { key: 'musculoskeletal', label: 'Musculoskeletal', icon: 'bone' },
  { key: 'renal', label: 'Renal', icon: 'kidney' },
  { key: 'hematology', label: 'Hematology', icon: 'blood-bag' },
];

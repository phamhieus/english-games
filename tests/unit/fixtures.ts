import type { SessionConfig, VocabularyItem } from '@/types';

export function makeWords(n: number, collectionId = 'c1'): VocabularyItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `w${i}`,
    collectionId,
    english: `word${i}`,
    vietnamese: `từ ${i}`,
    createdAt: i,
    updatedAt: i,
  }));
}

export function makeConfig(patch: Partial<SessionConfig> = {}): SessionConfig {
  return {
    collectionId: 'c1',
    collectionName: 'Test',
    mode: 'recall',
    difficulty: 'normal',
    style: 'practice',
    practiceSize: 10,
    ...patch,
  };
}

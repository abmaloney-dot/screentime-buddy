export const TAGS = [
  { id: 'meal', label: 'Meal time', emoji: '🍽️', color: '#F59E0B' },
  { id: 'work', label: 'Work / study', emoji: '💼', color: '#3B82F6' },
  { id: 'commute', label: 'Commute', emoji: '🚌', color: '#8B5CF6' },
  { id: 'social', label: 'Social', emoji: '💬', color: '#EC4899' },
  { id: 'fun', label: 'Entertainment', emoji: '🎬', color: '#EF4444' },
  { id: 'bed', label: 'Bedtime', emoji: '🛏️', color: '#14B8A6' },
  { id: 'other', label: 'Other', emoji: '📌', color: '#6B7280' },
] as const;

export type TagId = (typeof TAGS)[number]['id'];
export type Tag = (typeof TAGS)[number];

export function findTag(id: string | null | undefined): Tag | undefined {
  return TAGS.find((t) => t.id === id);
}

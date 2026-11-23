import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { TAGS, type TagId } from '@/lib/tags';
import { formatHour, formatMinutes } from '@/lib/time';
import { colors, spacing } from '@/theme';

export function TagPicker({
  hour,
  minutes,
  current,
  onSelect,
  onClose,
}: {
  hour: number | null;
  minutes: number;
  current: TagId | undefined;
  onSelect: (tag: TagId | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={hour !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        {hour !== null ? (
          <Text style={s.title}>
            {formatHour(hour)}–{formatHour((hour + 1) % 24)} · {formatMinutes(minutes)} on screen
          </Text>
        ) : null}
        <Text style={s.subtitle}>What were you doing?</Text>
        <View style={s.grid}>
          {TAGS.map((t) => {
            const active = t.id === current;
            return (
              <Pressable
                key={t.id}
                onPress={() => onSelect(t.id)}
                style={[s.chip, { borderColor: t.color }, active && { backgroundColor: t.color }]}>
                <Text style={[s.chipText, active && { color: '#fff' }]}>
                  {t.emoji} {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {current ? (
          <Pressable onPress={() => onSelect(null)} style={s.clear}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove label</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: colors.card,
    padding: spacing.xl,
    gap: spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 2, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  clear: { alignSelf: 'center', padding: spacing.sm },
});

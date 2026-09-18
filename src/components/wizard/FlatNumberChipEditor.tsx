import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { WIZARD_ACCENT } from './wizardStyles';

type Props = {
  numbers: string[];
  onChange: (numbers: string[]) => void;
  chairmanFlat: string | null;
  onChairmanFlatChange: (flat: string | null) => void;
  error?: string | null;
};

/** Chip-based editor for explicit flat numbers + chairman flat selection. */
export function FlatNumberChipEditor({
  numbers,
  onChange,
  chairmanFlat,
  onChairmanFlatChange,
  error,
}: Props) {
  const [draft, setDraft] = useState('');

  function addFlat() {
    const value = draft.trim().toUpperCase();
    if (!value) return;
    if (numbers.some((n) => n.toUpperCase() === value)) {
      setDraft('');
      return;
    }
    onChange([...numbers, value]);
    setDraft('');
  }

  function removeFlat(flat: string) {
    const next = numbers.filter((n) => n !== flat);
    onChange(next);
    if (chairmanFlat === flat) {
      onChairmanFlatChange(null);
    }
  }

  function selectChairman(flat: string) {
    onChairmanFlatChange(flat);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Flat numbers</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{numbers.length}</Text>
        </View>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. 101 or A-105"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={addFlat}
        />
        <Pressable style={styles.addBtn} onPress={addFlat}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {numbers.length === 0 ? (
        <Text style={styles.hint}>Add each flat number you want to create. Gaps are allowed.</Text>
      ) : (
        <>
          <Text style={styles.selectHint}>
            Tap a flat to mark it as your (Chairman) flat. Tap × to remove.
          </Text>
          <View style={styles.chipGrid}>
            {numbers.map((flat) => {
              const isChairman = chairmanFlat === flat;
              return (
                <View
                  key={flat}
                  style={[styles.chip, isChairman && styles.chipChairman]}
                >
                  <Pressable style={styles.chipMain} onPress={() => selectChairman(flat)}>
                    <Text style={[styles.chipText, isChairman && styles.chipTextChairman]}>
                      {flat}
                    </Text>
                    {isChairman ? <Text style={styles.chipBadge}>You</Text> : null}
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={() => removeFlat(flat)}
                    accessibilityLabel={`Remove flat ${flat}`}
                  >
                    <Text style={styles.chipRemove}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {chairmanFlat ? (
            <Text style={styles.chairmanChosen}>Chairman flat: {chairmanFlat}</Text>
          ) : (
            <Text style={styles.chairmanNeeded}>Select which flat is yours (Chairman).</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy900,
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: WIZARD_ACCENT,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy900,
    backgroundColor: '#f8fafc',
  },
  addBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: WIZARD_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  selectHint: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  chipChairman: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: WIZARD_ACCENT,
  },
  chipTextChairman: {
    color: '#fff',
  },
  chipBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  chipRemove: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: -1,
    paddingHorizontal: 2,
  },
  chairmanChosen: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  chairmanNeeded: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
});

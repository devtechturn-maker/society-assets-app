import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createBuildingDraft,
  resizeFlatNumberList,
  type BuildingFlatDraft,
} from '../../utils/flatNumbering';
import { colors } from '../../theme/colors';
import { WIZARD_ACCENT } from './wizardStyles';

const ACCENT = '#0F172A';

type Props = {
  buildings: BuildingFlatDraft[];
  onChange: (buildings: BuildingFlatDraft[]) => void;
  chairmanBuildingId: string | null;
  chairmanFlatDigits: string | null;
  onChairmanChange: (buildingId: string | null, flatDigits: string | null) => void;
};

export function BuildingFlatConfigEditor({
  buildings,
  onChange,
  chairmanBuildingId,
  chairmanFlatDigits,
  onChairmanChange,
}: Props) {
  function updateBuilding(id: string, patch: Partial<BuildingFlatDraft>) {
    const nextBuildings = buildings.map((b) => {
      if (b.id !== id) return b;
      const next = { ...b, ...patch };
      if (typeof patch.totalFlats === 'number') {
        next.flatNumbers = resizeFlatNumberList(b.flatNumbers, patch.totalFlats);
      }
      return next;
    });
    onChange(nextBuildings);
    if (chairmanBuildingId === id && chairmanFlatDigits) {
      const updated = nextBuildings.find((b) => b.id === id);
      if (!updated?.flatNumbers.includes(chairmanFlatDigits)) {
        onChairmanChange(id, null);
      }
    }
  }

  function setFlatValue(buildingId: string, index: number, value: string) {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
    const building = buildings.find((b) => b.id === buildingId);
    const previous = building?.flatNumbers[index] ?? '';
    onChange(
      buildings.map((b) => {
        if (b.id !== buildingId) return b;
        const flats = [...b.flatNumbers];
        flats[index] = digitsOnly;
        return { ...b, flatNumbers: flats };
      })
    );
    if (chairmanBuildingId === buildingId && chairmanFlatDigits === previous) {
      onChairmanChange(buildingId, digitsOnly || null);
    }
  }

  function removeBuilding(id: string) {
    const next = buildings.filter((b) => b.id !== id);
    onChange(next);
    if (chairmanBuildingId === id) {
      onChairmanChange(null, null);
    }
  }

  function addBuilding() {
    const nextIndex = buildings.length;
    const defaultName =
      nextIndex < 26 ? String.fromCharCode(65 + nextIndex) : `B${nextIndex + 1}`;
    onChange([...buildings, createBuildingDraft(defaultName, 0)]);
  }

  const chairmanBuilding = buildings.find((b) => b.id === chairmanBuildingId) ?? null;
  const chairmanFlatOptions = (chairmanBuilding?.flatNumbers ?? []).filter((f) => /^\d+$/.test(f.trim()));

  return (
    <View style={styles.root}>
      <Text style={styles.sectionTitle}>Buildings / Blocks</Text>
      <Text style={styles.sectionHint}>
        Add each building, set total flats, then enter numeric flat numbers (gaps allowed).
      </Text>

      {buildings.map((building) => (
        <View key={building.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <TextInput
              style={styles.buildingNameInput}
              value={building.name}
              onChangeText={(name) => updateBuilding(building.id, { name })}
              placeholder="Building name (e.g. A)"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
            />
            <Pressable
              style={styles.deleteBtn}
              onPress={() => removeBuilding(building.id)}
              hitSlop={8}
              accessibilityLabel={`Remove building ${building.name}`}
            >
              <Text style={styles.deleteBtnText}>🗑</Text>
            </Pressable>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total flats</Text>
            <TextInput
              style={styles.totalInput}
              value={building.totalFlats > 0 ? String(building.totalFlats) : ''}
              onChangeText={(v) => {
                const n = Number.parseInt(v.replace(/\D/g, '').slice(0, 4), 10);
                updateBuilding(building.id, {
                  totalFlats: Number.isFinite(n) ? Math.min(n, 5000) : 0,
                });
              }}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
            />
          </View>

          {building.flatNumbers.length > 0 ? (
            <View style={styles.flatsBlock}>
              {building.flatNumbers.map((flat, index) => (
                <View key={`${building.id}-${index}`} style={styles.flatRow}>
                  <Text style={styles.flatLabel}>Flat {index + 1}</Text>
                  <TextInput
                    style={styles.flatInput}
                    value={flat}
                    onChangeText={(v) => setFlatValue(building.id, index, v)}
                    placeholder="e.g. 101"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    maxLength={8}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyFlats}>Enter total flats to generate inputs.</Text>
          )}
        </View>
      ))}

      <Pressable style={styles.addBuildingBtn} onPress={addBuilding}>
        <Text style={styles.addBuildingText}>+ Add Building</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, styles.chairmanSection]}>Chairman Assignment</Text>
      <Text style={styles.sectionHint}>Select the building and exact flat for the chairman.</Text>

      <Text style={styles.pickerLabel}>Chairman building</Text>
      <View style={styles.chipRow}>
        {buildings.map((b) => {
          const selected = chairmanBuildingId === b.id;
          return (
            <Pressable
              key={b.id}
              style={[styles.choiceChip, selected && styles.choiceChipSelected]}
              onPress={() => onChairmanChange(b.id, null)}
            >
              <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                {b.name.trim() || '—'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.pickerLabel}>Chairman flat</Text>
      {chairmanBuildingId && chairmanFlatOptions.length > 0 ? (
        <View style={styles.chipRow}>
          {chairmanFlatOptions.map((flat) => {
            const selected = chairmanFlatDigits === flat;
            return (
              <Pressable
                key={`${chairmanBuildingId}-${flat}`}
                style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                onPress={() => onChairmanChange(chairmanBuildingId, flat)}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                  {flat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyFlats}>
          {chairmanBuildingId
            ? 'Enter numeric flat numbers in the selected building first.'
            : 'Select a chairman building first.'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ACCENT,
  },
  chairmanSection: {
    marginTop: 16,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buildingNameInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
    backgroundColor: '#f8fafc',
  },
  deleteBtn: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy900,
  },
  totalInput: {
    width: 88,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT,
    backgroundColor: '#f8fafc',
  },
  flatsBlock: {
    marginTop: 10,
    gap: 8,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flatLabel: {
    width: 58,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  flatInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
    color: WIZARD_ACCENT,
    backgroundColor: '#f8fafc',
  },
  emptyFlats: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
  },
  addBuildingBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addBuildingText: {
    fontSize: 14,
    fontWeight: '800',
    color: ACCENT,
  },
  pickerLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy900,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  choiceChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  choiceChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  choiceChipTextSelected: {
    color: '#fff',
  },
});

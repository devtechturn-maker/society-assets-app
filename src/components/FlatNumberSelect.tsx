import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  fetchRegisteredMembers,
  fetchSocietyInventoryFlats,
} from '../services/api';
import type { SocietyInventoryFlat } from '../types/api';
import { useTheme } from '../theme/ThemeContext';

type Mode = 'available' | 'all' | 'registered';

type FlatOption = {
  key: string;
  flatNumber: string;
  available?: boolean;
};

type Props = {
  value: string;
  onChange: (flatNumber: string) => void;
  /**
   * available = vacant/open inventory flats (assign member)
   * all = every inventory flat
   * registered = flats of registered members only (login linked; excludes Vacant)
   */
  mode?: Mode;
  /** When editing a member, keep their current flat selectable even if occupied */
  allowFlatNumber?: string | null;
  placeholder?: string;
  optional?: boolean;
  disabled?: boolean;
};

/**
 * Dropdown for selecting an existing society flat.
 * Renders options with ScrollView (not FlatList) so it is safe inside parent ScrollViews.
 */
export function FlatNumberSelect({
  value,
  onChange,
  mode = 'available',
  allowFlatNumber = null,
  placeholder = 'Select Flat Number',
  optional = false,
  disabled = false,
}: Props) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<FlatOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load =
      mode === 'registered'
        ? fetchRegisteredMembers().then((members) => {
            const seen = new Set<string>();
            const rows: FlatOption[] = [];
            for (const member of members) {
              const num = (member.flatNumber ?? '').trim().toUpperCase();
              if (!num || seen.has(num)) continue;
              seen.add(num);
              rows.push({ key: member.id || num, flatNumber: num });
            }
            return rows;
          })
        : fetchSocietyInventoryFlats().then((flats) =>
            filterInventoryFlats(flats, mode, allowFlatNumber)
          );

    load
      .then((rows) => {
        if (!cancelled) {
          setOptions(
            rows.sort((a, b) =>
              a.flatNumber.localeCompare(b.flatNumber, undefined, {
                numeric: true,
                sensitivity: 'base',
              })
            )
          );
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setOptions([]);
          setError(e instanceof Error ? e.message : 'Unable to load flats');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, allowFlatNumber]);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading flats…';
    if (error) return error;
    if (mode === 'registered') return 'No registered flats available';
    if (mode === 'available') return 'No available flats.';
    return 'No flats found.';
  }, [loading, error, mode]);

  const selectedLabel = value.trim() ? value.trim().toUpperCase() : placeholder;

  return (
    <View>
      <Pressable
        style={[
          styles.select,
          {
            borderColor: theme.inputBorder,
            backgroundColor: theme.inputBg,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        onPress={() => {
          if (!disabled) {
            setOpen((v) => !v);
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Text style={{ color: value.trim() ? theme.inputText : theme.placeholder, flex: 1 }}>
          {selectedLabel}
        </Text>
        <Text style={{ color: theme.textMuted }}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open ? (
        <ScrollView
          style={[styles.listWrap, { borderColor: theme.inputBorder, backgroundColor: theme.cardBg }]}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {optional ? (
            <Pressable
              style={[styles.item, { borderBottomColor: theme.divider }]}
              onPress={() => {
                onChange('');
                setOpen(false);
              }}
            >
              <Text style={{ color: theme.textMuted }}>{placeholder}</Text>
            </Pressable>
          ) : null}

          {options.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>{emptyMessage}</Text>
          ) : (
            options.map((item) => {
              const active = value.trim().toUpperCase() === item.flatNumber.trim().toUpperCase();
              return (
                <Pressable
                  key={item.key}
                  style={[
                    styles.item,
                    { borderBottomColor: theme.divider },
                    active ? { backgroundColor: theme.accentSoft } : null,
                  ]}
                  onPress={() => {
                    onChange(item.flatNumber.trim().toUpperCase());
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: active ? '700' : '600' }}>
                    {item.flatNumber}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function filterInventoryFlats(
  flats: SocietyInventoryFlat[],
  mode: Exclude<Mode, 'registered'>,
  allowFlatNumber?: string | null
): FlatOption[] {
  const allow = allowFlatNumber?.trim().toUpperCase() ?? '';
  return flats
    .filter((flat) => {
      const num = flat.flatNumber.trim().toUpperCase();
      if (mode === 'all') return true;
      if (allow && num === allow) return true;
      return flat.available === true;
    })
    .map((flat) => ({
      key: flat.flatId,
      flatNumber: flat.flatNumber.trim().toUpperCase(),
      available: flat.available,
    }));
}

const styles = StyleSheet.create({
  select: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listWrap: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 220,
  },
  listContent: {
    flexGrow: 0,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    padding: 14,
    fontSize: 13,
    textAlign: 'center',
  },
});

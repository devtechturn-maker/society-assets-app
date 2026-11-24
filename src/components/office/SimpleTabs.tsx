import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/** A small top tab bar used to add v23 screens inside existing modules (no new menu item, safe for old apps). */
export function SimpleTabs({ tabs }: { tabs: { id: string; label: string; render: () => ReactNode }[] }) {
  const { theme } = useTheme();
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.bar, { borderBottomColor: theme.cardBorder }]}>
        {tabs.map((t) => {
          const on = t.id === current?.id;
          return (
            <Pressable key={t.id} onPress={() => setActive(t.id)} style={[styles.tab, on && { borderBottomColor: theme.accent }]}>
              <Text style={{ color: on ? theme.accent : theme.textMuted, fontWeight: '800' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>{current?.render()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
});

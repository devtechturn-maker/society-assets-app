import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { useTheme } from '../../theme/ThemeContext';

export function AppearanceModule() {
  const { theme, mode, setMode } = useTheme();

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}>
      <LinearGradient colors={[...theme.headerGradient]} style={styles.hero}>
        <Text style={styles.heroEmoji}>🌓</Text>
        <Text style={styles.heroTitle}>Appearance</Text>
        <Text style={styles.heroSub}>Choose how Society Assets looks on your device</Text>
      </LinearGradient>

      <SectionCard title="Theme mode" subtitle="Saved on this device only">
        <ModeOption
          label="Light mode"
          description="Bright backgrounds, best in daylight"
          active={mode === 'light'}
          onPress={() => setMode('light')}
        />
        <ModeOption
          label="Dark mode"
          description="Reduced glare, easier at night"
          active={mode === 'dark'}
          onPress={() => setMode('dark')}
        />
      </SectionCard>

      <SectionCard title="Quick toggle">
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>Dark mode</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={(on) => setMode(on ? 'dark' : 'light')}
            trackColor={{ false: theme.divider, true: theme.accentGold }}
          />
        </View>
      </SectionCard>

    </ScrollView>
  );
}

function ModeOption({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[
        styles.option,
        { borderColor: theme.divider },
        active ? { borderColor: theme.accentGold, backgroundColor: theme.accentSoft } : null,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.optionDesc, { color: theme.textMuted }]}>{description}</Text>
      {active ? <Text style={[styles.activeTag, { color: theme.accentGold }]}>Active</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroSub: { fontSize: 14, color: '#cbd5e1', textAlign: 'center', marginTop: 6 },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionLabel: { fontSize: 16, fontWeight: '700' },
  optionDesc: { fontSize: 13, marginTop: 4 },
  activeTag: { fontSize: 12, fontWeight: '700', marginTop: 8, textTransform: 'uppercase' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
});

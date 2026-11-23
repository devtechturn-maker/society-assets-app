import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { VisitorHistoryModule } from '../../screens/modules/VisitorHistoryModule';
import { DeliveryRegister } from './DeliveryRegister';

/** Guard History: ordinary visitors, or the delivery register with parcels at the gate. */
export function GateHistoryTabs() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<'visitors' | 'deliveries'>('visitors');
  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.tabs, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        {(['visitors', 'deliveries'] as const).map((t) => {
          const on = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on ? { borderBottomColor: theme.accent } : null]}
            >
              <Text style={{ color: on ? theme.text : theme.textMuted, fontWeight: on ? '800' : '600' }}>
                {t === 'visitors' ? 'Visitors' : 'Deliveries'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        {tab === 'visitors' ? <VisitorHistoryModule gateKeeper /> : <DeliveryRegister />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
});

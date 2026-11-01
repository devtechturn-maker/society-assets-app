import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/** Shown when this app version is too old for the server; the only way forward is the Play Store. */
export function UpdateRequiredScreen({ storeUrl }: { storeUrl: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Update required</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>
        A new version of Society Assets is available. Please update the app to keep using it.
      </Text>
      <Pressable
        onPress={() => void Linking.openURL(storeUrl)}
        style={[styles.btn, { backgroundColor: theme.accent }]}
      >
        <Text style={styles.btnText}>Update now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  btn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

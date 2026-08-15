import { ScrollView, StyleSheet, Text } from 'react-native';
import { SectionCard } from '../../components/dashboard/SectionCard';

export function SupportModule() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <SectionCard title="Help & support">
        <Text style={styles.body}>
          For help with billing, contracts, or reports, contact your society chairman or treasurer.
        </Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32 },
  body: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 12 },
});

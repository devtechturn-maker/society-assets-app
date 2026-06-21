import { ScrollView, StyleSheet, Text } from 'react-native';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { useTheme } from '../../theme/ThemeContext';

type AboutBlock = {
  title: string;
  paragraphs: string[];
};

const ABOUT_BLOCKS: AboutBlock[] = [
  {
    title: 'Our mission',
    paragraphs: [
      'Society Assets helps housing societies run maintenance, expenses, and member communication in one secure place.',
      'We built GrihaLedger so chairmen spend less time on spreadsheets and members always know where they stand.',
    ],
  },
  {
    title: 'What you can do',
    paragraphs: [
      'Track maintenance collections, society expenses, contracts, and financial reports from a single dashboard.',
      'Notify members about rules, polls, and updates through the mobile app with real-time push alerts.',
      'Give residents a simple portal to view dues, pay online, book amenities, and raise complaints.',
    ],
  },
  {
    title: 'Built on trust',
    paragraphs: [
      'Your society data is scoped to your account — members only see information for their own society.',
      'Online payments use secure checkout with receipts emailed to members after successful payment.',
      'Role-based access keeps chairman, treasurer, and member actions clearly separated.',
    ],
  },
  {
    title: 'Building trust. Managing assets.',
    paragraphs: [
      'Society Assets is designed for Indian housing societies that want clarity, accountability, and modern tools without complexity.',
      'Thank you for choosing us to support your community.',
    ],
  },
];

export function AboutUsModule() {
  const { theme } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <SectionCard
        title="About Us"
        subtitle="Society Assets — building trust and managing assets for modern housing communities."
      >
        {ABOUT_BLOCKS.map((block) => (
          <SectionCard key={block.title} title={block.title}>
            {block.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={[styles.body, { color: theme.textMuted }]}>
                {paragraph}
              </Text>
            ))}
          </SectionCard>
        ))}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 12, paddingBottom: 32, gap: 12 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
});

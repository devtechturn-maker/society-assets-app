import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '../../components/AppLogo';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { APP_NAME, APP_TAGLINE } from '../../constants/branding';
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
      'We built Society Assets so chairmen spend less time on spreadsheets and members always know where they stand.',
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
      <View style={[styles.hero, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <AppLogo variant="glyph" size={44} framed />
        <Text style={[styles.heroTitle, { color: theme.text }]}>{APP_NAME}</Text>
        <Text style={[styles.heroHeader, { color: theme.textMuted }]}>{APP_TAGLINE}</Text>
      </View>

      <SectionCard title="About Us" subtitle={`${APP_NAME} — building trust and managing assets for modern housing communities.`}>
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
  hero: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroHeader: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
});

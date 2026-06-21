import { ScrollView, StyleSheet, Text } from 'react-native';
import { SectionCard } from '../../components/dashboard/SectionCard';
import { useTheme } from '../../theme/ThemeContext';

type HelpSection = {
  title: string;
  items: string[];
};

const CHAIRMAN_HELP: HelpSection[] = [
  {
    title: 'Getting started',
    items: [
      'Complete maintenance setup under Services before recording collections.',
      'Add society members with flat numbers so maintenance and reports stay accurate.',
      'Use the dashboard overview to track income, expenses, and pending dues at a glance.',
    ],
  },
  {
    title: 'Maintenance & collections',
    items: [
      'Record maintenance manually or import entries from Excel under the Maintenance module.',
      'Members can pay online when payment settings are configured in Services.',
      'Send pending reminders from the Maintenance audit view for members with outstanding dues.',
    ],
  },
  {
    title: 'Members & communication',
    items: [
      'Publish society rules from About Society — members receive an app notification.',
      'Create polls to collect member opinions and share results when voting closes.',
      'Use Group Chat to message members in society groups.',
    ],
  },
  {
    title: 'Reports & subscription',
    items: [
      'Download financial reports and email them to members from the Reports module.',
      'Manage your Society Assets plan, upgrade, or buy extra member slots under Subscription.',
      'Keep your subscription active to avoid interruption to society features.',
    ],
  },
  {
    title: 'Need more help?',
    items: [
      'Check About Us for product information and our mission.',
      'Contact your society office for flat-specific or payment disputes.',
      'For technical issues, reach out to your Society Assets support contact.',
    ],
  },
];

const MEMBER_HELP: HelpSection[] = [
  {
    title: 'Your member portal',
    items: [
      'View your maintenance history and pending dues under My Maintenance.',
      'Pay maintenance online when your chairman has enabled member payments.',
      'Keep your profile email verified to receive notifications and receipts.',
    ],
  },
  {
    title: 'Staying informed',
    items: [
      'Society rules published by the chairman appear under About Society with push notifications.',
      'Vote on active polls and view results when the chairman shares them.',
      'Use Group Chat to stay connected with your society groups.',
    ],
  },
  {
    title: 'Complaints & amenities',
    items: [
      'Raise a complaint from the Complaints module — the chairman is notified immediately.',
      'Book shared amenities such as the clubhouse or party hall when available.',
      'Track complaint status updates in the app notification inbox.',
    ],
  },
  {
    title: 'Need more help?',
    items: [
      'Visit About Us to learn more about Society Assets.',
      'For payment or flat-specific questions, contact your society office.',
      'For app issues, ask your chairman or society support contact.',
    ],
  },
];

type Props = {
  memberPortal?: boolean;
};

export function HelpModule({ memberPortal = false }: Props) {
  const { theme } = useTheme();
  const sections = memberPortal ? MEMBER_HELP : CHAIRMAN_HELP;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <SectionCard
        title="Help"
        subtitle={
          memberPortal
            ? 'Quick answers for members using the Society Assets mobile app.'
            : 'Quick answers for chairmen managing your society on web and mobile.'
        }
      >
        {sections.map((section) => (
          <SectionCard key={section.title} title={section.title}>
            {section.items.map((item) => (
              <Text key={item} style={[styles.bullet, { color: theme.textMuted }]}>
                • {item}
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
  bullet: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
});

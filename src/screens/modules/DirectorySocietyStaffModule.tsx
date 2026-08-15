import { ScrollView, StyleSheet } from 'react-native';

import { ListEmpty } from '../../components/dashboard/ListStates';
import { DirectoryListItem } from '../../components/directory/DirectoryListItem';
import { DirectorySectionShell } from './DirectoryHubModule';

/**
 * Visual-only screen for Society Staff.
 * List data is not wired yet — empty state + list-item template for future data.
 */
export function DirectorySocietyStaffModule({ onBack }: { onBack: () => void }) {
  const staff: Array<{
    id: string;
    name: string;
    role: string;
    phone?: string;
    shift?: string;
  }> = [];

  return (
    <DirectorySectionShell title="Society Staff" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        {staff.length === 0 ? (
          <ListEmpty
            icon="staff"
            title="No society staff yet"
            subtitle="Watchmen, plumbers, and other staff will appear here."
          />
        ) : (
          staff.map((person) => (
            <DirectoryListItem
              key={person.id}
              title={person.name}
              meta={[person.role, person.shift].filter(Boolean).join(' · ')}
              secondaryMeta={person.phone}
              avatarIcon="staff"
              roleLabel={person.role}
              onCall={person.phone ? () => undefined : undefined}
            />
          ))
        )}
      </ScrollView>
    </DirectorySectionShell>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
});

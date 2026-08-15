import { ScrollView, StyleSheet } from 'react-native';

import { ListEmpty } from '../../components/dashboard/ListStates';
import { DirectoryListItem } from '../../components/directory/DirectoryListItem';
import { DirectorySectionShell } from './DirectoryHubModule';

/**
 * Visual-only screen for Important Contacts.
 * List data is not wired yet — empty state + list-item template for future data.
 */
export function DirectoryImportantContactsModule({ onBack }: { onBack: () => void }) {
  const contacts: Array<{
    id: string;
    name: string;
    role: string;
    phone?: string;
  }> = [];

  return (
    <DirectorySectionShell title="Important Contacts" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.content}>
        {contacts.length === 0 ? (
          <ListEmpty
            icon="phone"
            title="No important contacts yet"
            subtitle="Society emergency and utility contacts will appear here."
          />
        ) : (
          contacts.map((contact) => (
            <DirectoryListItem
              key={contact.id}
              title={contact.name}
              meta={contact.role}
              secondaryMeta={contact.phone}
              avatarIcon="phone"
              onCall={contact.phone ? () => undefined : undefined}
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

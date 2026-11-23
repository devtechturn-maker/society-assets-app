import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { NoticeModule } from '../../screens/modules/NoticeModule';
import { PollsView } from '../polls/PollsView';

/** Notices with a second tab for society-wide polls; kept in one menu item so older apps see no new screens. */
export function NoticesAndPolls({
  memberPortal = false,
  canManageNotices = false,
  canCreatePolls = false,
  initialNoticeId,
  onInitialNoticeConsumed,
}: {
  memberPortal?: boolean;
  canManageNotices?: boolean;
  canCreatePolls?: boolean;
  initialNoticeId?: string | null;
  onInitialNoticeConsumed?: () => void;
}) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<'notices' | 'polls'>('notices');
  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <View style={[styles.tabs, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        {(['notices', 'polls'] as const).map((t) => {
          const on = t === tab;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, on ? { borderBottomColor: theme.accent } : null]}
            >
              <Text style={{ color: on ? theme.text : theme.textMuted, fontWeight: on ? '800' : '600' }}>
                {t === 'notices' ? 'Notices' : 'Polls'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        {tab === 'notices' ? (
          <NoticeModule
            memberPortal={memberPortal}
            canManageNotices={canManageNotices}
            initialNoticeId={initialNoticeId}
            onInitialNoticeConsumed={onInitialNoticeConsumed}
          />
        ) : (
          <PollsView memberPortal={memberPortal} canCreate={canCreatePolls} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
});

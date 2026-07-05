import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AddMemberModal } from '../../components/members/AddMemberModal';
import { EditMemberModal } from '../../components/members/EditMemberModal';
import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';
import { UiIcon } from '../../components/UiIcon';
import type { UiIconName } from '../../constants/uiIcons';
import { fetchMemberDirectory, fetchMembers } from '../../services/api';
import { useAppAlert } from '../../context/AppAlertContext';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useHardwareBack } from '../../hooks/useHardwareBack';
import { useTheme } from '../../theme/ThemeContext';
import type { DirectoryEntry, SocietyMember } from '../../types/api';

export type DirectoryMemberRow = DirectoryEntry & Partial<SocietyMember>;

type Props = {
  onBack: () => void;
  memberPortal?: boolean;
  canManage?: boolean;
};

function memberInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function formatFlatLabel(flatNumber: string): string {
  const trimmed = flatNumber.trim();
  if (!trimmed) return '—';
  if (/\s/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^([A-Za-z]+)(\d.*)$/);
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`;
  }
  return trimmed;
}

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return 'Never logged in';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never logged in';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

function matchesMember(member: DirectoryMemberRow, query: string): boolean {
  if (!query) return true;
  return [member.name, member.flatNumber, member.phone, member.email ?? '', member.ownershipLabel ?? '']
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function sortMembers(members: DirectoryMemberRow[]): DirectoryMemberRow[] {
  return [...members].sort((a, b) =>
    a.flatNumber.localeCompare(b.flatNumber, undefined, { numeric: true, sensitivity: 'base' })
  );
}

function DetailRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: UiIconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const content = (
    <View style={[styles.detailRow, { borderBottomColor: theme.divider }]}>
      <View style={[styles.detailIconWrap, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <UiIcon name={icon} size={22} color={theme.text} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailTitle, { color: theme.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.detailSubtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.rowPressed : null)}>
      {content}
    </Pressable>
  );
}

function DirectoryMemberDetail({
  member,
  onBack,
  canManage,
  onUpdated,
}: {
  member: DirectoryMemberRow;
  onBack: () => void;
  canManage: boolean;
  onUpdated: () => void;
}) {
  const { theme } = useTheme();
  const { alert } = useAppAlert();
  const [editOpen, setEditOpen] = useState(false);

  useHardwareBack(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack]),
    true
  );

  async function dialPhone() {
    const digits = (member.phone ?? '').replace(/\s+/g, '');
    if (!digits) {
      await alert('No phone', 'This member has no phone number on file.', { variant: 'error' });
      return;
    }
    await Linking.openURL(`tel:${digits}`).catch(() => undefined);
  }

  const flatLabel = member.flatNumber.trim() || '—';
  const ownership = member.ownershipLabel ?? (member.isTreasurer ? 'Treasurer' : 'Owner');

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <LinearGradient colors={[...theme.headerGradient]} style={styles.detailHero}>
        <View style={styles.detailTopRow}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.headerIconBtn}>
            <UiIcon name="chevron-left" size={22} color="#fff" />
          </Pressable>
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailFlatText} numberOfLines={1}>
              {flatLabel}
            </Text>
            <Text style={styles.detailNameText} numberOfLines={1}>
              {member.name}
            </Text>
          </View>
          <View style={styles.headerIconBtn} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.detailScroll}>
        <DetailRow
          icon="phone"
          title={member.phone?.trim() || 'No phone listed'}
          subtitle="Mobile"
          onPress={member.phone?.trim() ? () => void dialPhone() : undefined}
        />
        <DetailRow icon="family" title="0 Adult Count" subtitle="0 Child Count" />
        <DetailRow icon="building" title={ownership} />
        <DetailRow
          icon="document"
          title="View Bill History"
          onPress={() => void alert('Bill history', 'Maintenance bill history will open here.', { variant: 'info' })}
        />
        {canManage ? (
          <DetailRow icon="users" title="Manage Member History" onPress={() => setEditOpen(true)} />
        ) : null}
        {member.customMaintenanceAmount != null && member.customMaintenanceAmount > 0 ? (
          <DetailRow
            icon="statistics"
            title={String(member.customMaintenanceAmount)}
            subtitle="Custom maintenance (₹)"
          />
        ) : null}
        {member.email ? <DetailRow icon="email" title={member.email} subtitle="Email" /> : null}
        <DetailRow icon="clock" title={formatLastLogin(member.lastLoginAt)} subtitle="Last login" />
      </ScrollView>

      {canManage ? (
        <EditMemberModal
          visible={editOpen}
          member={member as SocietyMember}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            onUpdated();
          }}
        />
      ) : null}
    </View>
  );
}

export function DirectoryMembersModule({ onBack, memberPortal = false, canManage = false }: Props) {
  const { theme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<DirectoryMemberRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loader = useAsyncLoad(
    memberPortal ? fetchMemberDirectory : fetchMembers,
    [memberPortal]
  );

  const members = (loader.data ?? []) as DirectoryMemberRow[];

  const filtered = useMemo(() => {
    const query = normalizeQuery(search);
    return members.filter((member) => matchesMember(member, query));
  }, [members, search]);

  const sortedMembers = useMemo(() => sortMembers(filtered), [filtered]);

  useHardwareBack(
    useCallback(() => {
      onBack();
      return true;
    }, [onBack]),
    selected === null
  );

  async function dialMember(phone: string) {
    const digits = phone.replace(/\s+/g, '');
    if (!digits) return;
    await Linking.openURL(`tel:${digits}`).catch(() => undefined);
  }

  if (selected) {
    return (
      <DirectoryMemberDetail
        member={selected}
        onBack={() => setSelected(null)}
        canManage={canManage}
        onUpdated={loader.refresh}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <LinearGradient colors={[...theme.headerGradient]} style={styles.listHero}>
        <View style={styles.listTopRow}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.headerIconBtn}>
            <UiIcon name="chevron-left" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Members</Text>
          <View style={styles.listTopActions}>
            <Pressable
              onPress={() => setSearchOpen((open) => !open)}
              hitSlop={10}
              style={styles.headerIconBtn}
            >
              <UiIcon name="search" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsBar}>
          <Text style={styles.statsText}>Members : {members.length}</Text>
          <Text style={styles.statsText}>Population : 0</Text>
        </View>
      </LinearGradient>

      {searchOpen ? (
        <View style={[styles.searchWrap, { backgroundColor: theme.cardBg, borderBottomColor: theme.divider }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search members"
            placeholderTextColor={theme.placeholder}
            style={[
              styles.searchInput,
              {
                color: theme.text,
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBg,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}

      {loader.loading ? (
        <ListLoading />
      ) : loader.error ? (
        <ListError message={loader.error} />
      ) : (
        <ScrollView
          style={styles.listScroll}
          refreshControl={<RefreshControl refreshing={loader.refreshing} onRefresh={loader.refresh} />}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <ListEmpty message={search ? 'No matches found.' : 'No members yet.'} />
          ) : (
            sortedMembers.map((member) => {
              const ownership = member.ownershipLabel ?? (member.isTreasurer ? 'Treasurer' : 'Owner');
              return (
                <Pressable
                  key={member.id}
                  style={({ pressed }) => [
                    styles.memberRow,
                    { backgroundColor: theme.cardBg, borderBottomColor: theme.divider },
                    pressed ? styles.rowPressed : null,
                  ]}
                  onPress={() => setSelected(member)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.accent }]}>{memberInitial(member.name)}</Text>
                  </View>
                  <View style={styles.memberBody}>
                    <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
                    <Text style={[styles.memberFlat, { color: theme.text }]}>{formatFlatLabel(member.flatNumber)}</Text>
                    <Text style={[styles.memberRole, { color: theme.accent }]}>{ownership}</Text>
                    <Text style={[styles.memberLogin, { color: theme.textMuted }]}>
                      Last Login: {formatLastLogin(member.lastLoginAt)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      void dialMember(member.phone ?? '');
                    }}
                    hitSlop={10}
                    style={styles.callBtn}
                  >
                    <UiIcon name="phone" size={20} color={theme.textMuted} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {canManage ? (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => setAddOpen(true)}
          accessibilityLabel="Add member"
        >
          <UiIcon name="plus" size={28} color="#fff" />
        </Pressable>
      ) : null}

      {canManage ? (
        <AddMemberModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loader.refresh();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listHero: {
    paddingTop: 8,
    paddingBottom: 0,
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 48,
  },
  listTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  listScroll: { flex: 1 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowPressed: { opacity: 0.88 },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  memberBody: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
  },
  memberFlat: {
    fontSize: 14,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  memberLogin: {
    fontSize: 11,
    marginTop: 4,
  },
  callBtn: {
    paddingTop: 4,
    paddingLeft: 8,
  },
  callIcon: {
    fontSize: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  detailHero: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    minHeight: 48,
  },
  detailTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  detailFlatText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  detailNameText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  detailScroll: {
    paddingBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailSubtitle: {
    fontSize: 13,
  },
});

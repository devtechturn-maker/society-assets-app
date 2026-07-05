import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogoLoader } from '../components/AppLogoLoader';
import { AppLogo } from '../components/AppLogo';
import { SelectableOptionCard, WIZARD_ACCENT } from '../components/wizard';
import { isMemberRole } from '../services/api';
import {
  canSwitchAppView,
  clearAppViewContext,
  getAvailableLoginRoles,
  setAppViewContext,
  type AppViewContext,
  type LoginRoleOption,
} from '../services/appContext';
import { saveSession } from '../services/storage';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme/colors';
import type { LoginData } from '../types/api';
import { userDisplayName } from '../utils/userDisplayName';
import { CreateSocietyWizard } from './CreateSocietyWizard';
import { LinkMemberFlatWizard } from './LinkMemberFlatWizard';

type Props = {
  user: LoginData;
  onSelected: (context: AppViewContext) => void;
  onUserUpdated: (user: LoginData) => void;
  onLogout: () => void;
};

type ScreenMode = 'roles' | 'link' | 'create';

export function RoleSelectionScreen({ user, onSelected, onUserUpdated, onLogout }: Props) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<ScreenMode>('roles');
  const roles = useMemo(() => getAvailableLoginRoles(user), [user]);
  const [selected, setSelected] = useState<AppViewContext | null>(null);
  const [loading, setLoading] = useState(false);

  const staffUser = !isMemberRole(user.role);
  const hasMemberLink = canSwitchAppView(user);
  const showSocietyCard = staffUser;

  async function continueWithRole(context: AppViewContext) {
    setSelected(context);
    setLoading(true);
    try {
      await setAppViewContext(context);
      onSelected(context);
    } finally {
      setLoading(false);
    }
  }

  async function handleUserRefresh(data: LoginData) {
    await clearAppViewContext();
    await saveSession(data);
    onUserUpdated(data);
    setMode('roles');
    setSelected(null);
  }

  if (mode === 'link') {
    return (
      <LinkMemberFlatWizard
        user={user}
        onLinked={(data) => void handleUserRefresh(data)}
        onBack={() => setMode('roles')}
      />
    );
  }

  if (mode === 'create') {
    return (
      <CreateSocietyWizard
        additionalSociety
        initialChairmanName={userDisplayName(user)}
        onCreated={(data) => void handleUserRefresh(data)}
        onBack={() => setMode('roles')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.pageBg }]}>
      <StatusBar style={theme.statusBar} />
      <LinearGradient colors={[...theme.headerGradient]} style={styles.hero}>
        <AppLogo variant="glyph" size={40} framed />
        <Text style={styles.heroTitle}>Choose how to continue</Text>
        <Text style={styles.heroSubtitle}>
          Signed in as {userDisplayName(user) || 'your account'}. Pick the view you want to use now.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Continue as</Text>
          {roles.map((role: LoginRoleOption) => (
            <SelectableOptionCard
              key={role.context}
              title={role.title}
              meta={role.subtitle}
              selected={selected === role.context}
              showChevron
              disabled={loading}
              onPress={() => void continueWithRole(role.context)}
            />
          ))}
        </View>

        {showSocietyCard ? (
          <View style={[styles.groupCard, { borderColor: colors.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.groupTitle, { color: colors.navy900 }]}>Society</Text>
            <Text style={[styles.groupSubtitle, { color: theme.textMuted }]}>
              Link your flat or register another society with this mobile number.
            </Text>

            <View style={[styles.groupInner, { borderColor: colors.border }]}>
              {!hasMemberLink ? (
                <>
                  <Pressable
                    style={({ pressed }) => [styles.groupRow, pressed && styles.groupRowPressed]}
                    onPress={() => setMode('link')}
                    disabled={loading}
                  >
                    <View style={styles.groupRowBody}>
                      <Text style={styles.groupRowTitle}>Join society</Text>
                      <Text style={[styles.groupRowMeta, { color: theme.textMuted }]}>
                        Enter join code and pick your flat
                      </Text>
                    </View>
                    <Text style={styles.groupRowChevron}>›</Text>
                  </Pressable>
                  <View style={[styles.groupDivider, { backgroundColor: colors.border }]} />
                </>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.groupRow, pressed && styles.groupRowPressed]}
                onPress={() => setMode('create')}
                disabled={loading}
              >
                <View style={styles.groupRowBody}>
                  <Text style={styles.groupRowTitle}>Create society</Text>
                  <Text style={[styles.groupRowMeta, { color: theme.textMuted }]}>
                    Set up a new society as chairman
                  </Text>
                </View>
                <Text style={styles.groupRowChevron}>›</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <AppLogoLoader size="md" tone="onLight" label="Opening your workspace…" />
          </View>
        ) : null}

        <Pressable style={styles.logoutBtn} onPress={onLogout} disabled={loading}>
          <Text style={[styles.logoutText, { color: theme.textMuted }]}>Sign out instead</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: {
    marginTop: 16,
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  groupCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  groupSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -4,
  },
  groupInner: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  groupRowPressed: {
    backgroundColor: '#faf5ff',
  },
  groupRowBody: {
    flex: 1,
    minWidth: 0,
  },
  groupRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WIZARD_ACCENT,
  },
  groupRowMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  groupRowChevron: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '300',
    color: WIZARD_ACCENT,
  },
  groupDivider: {
    height: StyleSheet.hairlineWidth,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

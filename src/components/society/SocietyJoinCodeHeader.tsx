import { AppLogoLoader } from '../AppLogoLoader';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UiIcon } from '../UiIcon';
import { fetchSocietyJoinCode } from '../../services/api';
import { useAsyncLoad } from '../../hooks/useAsyncLoad';
import { useAppAlert } from '../../context/AppAlertContext';
import { formatJoinCodeDisplay, shareSocietyJoinInvite } from '../../utils/societyJoinShare';

export function SocietyJoinCodeHeader() {
  const { alert } = useAppAlert();
  const joinCode = useAsyncLoad(fetchSocietyJoinCode, []);

  async function shareCode() {
    if (!joinCode.data?.joinCode) {
      return;
    }
    try {
      await shareSocietyJoinInvite(joinCode.data.societyName, joinCode.data.joinCode);
    } catch {
      alert('Share failed', 'Could not open share options on this device.', { variant: 'error' });
    }
  }

  if (joinCode.loading) {
    return (
      <View style={styles.row}>
        <AppLogoLoader size="sm" minimal />
      </View>
    );
  }

  if (joinCode.error || !joinCode.data?.joinCode) {
    return null;
  }

  return (
    <View style={styles.row}>
      <View style={styles.codeWrap}>
        <Text style={styles.label}>Join code</Text>
        <Text style={styles.code} selectable numberOfLines={1}>
          {formatJoinCodeDisplay(joinCode.data.joinCode)}
        </Text>
      </View>
      <Pressable
        style={styles.shareBtn}
        onPress={() => void shareCode()}
        accessibilityLabel="Share join code"
        accessibilityRole="button"
      >
        <UiIcon name="share" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  codeWrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  code: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

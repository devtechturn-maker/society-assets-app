import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const VISITOR_SOUND_BY_TYPE: Record<string, number> = {
  VISITOR_ARRIVED: require('../../assets/sounds/visitor_arrived.wav'),
  VISITOR_APPROVED: require('../../assets/sounds/visitor_approved.wav'),
  VISITOR_REJECTED: require('../../assets/sounds/visitor_rejected.wav'),
};

let audioModeReady = false;
let activeSound: Audio.Sound | null = null;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

/** Play bundled visitor alert WAV (works in Expo Go + native builds when app receives the push). */
export async function playVisitorNotificationSound(type?: string | null): Promise<void> {
  if (!type) return;
  const source = VISITOR_SOUND_BY_TYPE[type];
  if (!source) return;

  try {
    await ensureAudioMode();
    if (activeSound) {
      try {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
      } catch {
        /* ignore */
      }
      activeSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume: 1,
    });
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        void sound.unloadAsync().catch(() => undefined);
        if (activeSound === sound) {
          activeSound = null;
        }
      }
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] visitor sound playback failed', error);
    }
  }
}

export function visitorSoundFileName(type?: string | null): string | null {
  switch (type) {
    case 'VISITOR_ARRIVED':
      return 'visitor_arrived.wav';
    case 'VISITOR_APPROVED':
      return 'visitor_approved.wav';
    case 'VISITOR_REJECTED':
      return 'visitor_rejected.wav';
    default:
      return null;
  }
}

export function visitorAndroidChannelId(type?: string | null): string {
  switch (type) {
    case 'VISITOR_ARRIVED':
      return 'visitors_arrived_v3';
    case 'VISITOR_APPROVED':
      return 'visitors_approved_v3';
    case 'VISITOR_REJECTED':
      return 'visitors_rejected_v3';
    default:
      return 'visitors_v3';
  }
}

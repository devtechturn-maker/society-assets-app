import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const VISITOR_SOUND_BY_TYPE: Record<string, number> = {
  VISITOR_ARRIVED: require('../../assets/sounds/visitor_arrived.wav'),
  VISITOR_APPROVED: require('../../assets/sounds/visitor_approved.wav'),
  VISITOR_REJECTED: require('../../assets/sounds/visitor_rejected.wav'),
};

let audioModeReady = false;
let activePlayer: AudioPlayer | null = null;
let activeSubscription: { remove: () => void } | null = null;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'duckOthers',
  });
  audioModeReady = true;
}

function releaseActivePlayer(): void {
  if (activeSubscription) {
    try {
      activeSubscription.remove();
    } catch {
      /* ignore */
    }
    activeSubscription = null;
  }
  if (!activePlayer) return;
  try {
    activePlayer.pause();
    activePlayer.remove();
  } catch {
    /* ignore */
  }
  activePlayer = null;
}

/** Play bundled visitor alert WAV (works in Expo Go + native builds when app receives the push). */
export async function playVisitorNotificationSound(type?: string | null): Promise<void> {
  if (!type) return;
  const source = VISITOR_SOUND_BY_TYPE[type];
  if (!source) return;

  try {
    await ensureAudioMode();
    releaseActivePlayer();

    const player = createAudioPlayer(source, { updateInterval: 200 });
    activePlayer = player;
    player.volume = 1;
    activeSubscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      if (activePlayer === player) {
        releaseActivePlayer();
      } else {
        try {
          player.remove();
        } catch {
          /* ignore */
        }
      }
    });
    player.play();
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

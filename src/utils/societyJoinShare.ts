import { Platform, Share } from 'react-native';
import { APP_NAME } from '../constants/branding';
import {
  ANDROID_STORE_URL,
  IOS_STORE_URL,
  joinGuideVideoLine,
} from '../constants/appStoreLinks';

export const JOIN_CODE_LENGTH = 8;
export const JOIN_CODE_GROUP_SIZE = 4;

export function normalizeJoinCodeInput(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, JOIN_CODE_LENGTH);
}

export function formatJoinCodeDisplay(code: string): string {
  const raw = normalizeJoinCodeInput(code);
  return raw.replace(/(.{4})/g, '$1 ').trim();
}

export function buildSocietyJoinShareMessage(societyName: string, rawJoinCode: string): string {
  const name = societyName.trim() || 'your society';
  const code = formatJoinCodeDisplay(rawJoinCode);

  return [
    `🏢 Join ${name} on ${APP_NAME}`,
    '',
    'Manage maintenance payments, notices, complaints, visitors, amenities and society updates—all in one app.',
    '',
    `🔑 Society Join Code: "${code}"`,
    '',
    'How to Join:',
    `Tap the download link ➜ Install the app ➜ Open ${APP_NAME} ➜ Tap Join Society ➜ Enter the join code ➜ Select your flat ➜ Complete registration.`,
    '',
    '📱 Download the App',
    '',
    'Android:',
    ANDROID_STORE_URL,
    '',
    'iPhone:',
    IOS_STORE_URL,
    '',
    '🎥 Watch the joining and login guide:',
    joinGuideVideoLine(),
    '',
    'Already installed? Open the app ➜ Tap Join Society ➜ Enter the code.',
    '',
    'For help, please contact your society chairman or committee.',
  ].join('\n');
}

/** Opens the system share sheet (WhatsApp, SMS, email, copy, etc.). */
export async function shareSocietyJoinInvite(societyName: string, rawJoinCode: string): Promise<void> {
  const message = buildSocietyJoinShareMessage(societyName, rawJoinCode);
  const title = `Join ${societyName.trim() || 'your society'} on ${APP_NAME}`;

  await Share.share(
    Platform.select({
      ios: { message, subject: title },
      default: { message, title },
    })!
  );
}

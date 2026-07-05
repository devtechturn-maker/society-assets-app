import { Platform, Share } from 'react-native';

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
  const code = formatJoinCodeDisplay(rawJoinCode);
  return (
    `Join ${societyName} on Society Assets.\n\n` +
    `Society join code: ${code}\n\n` +
    `Open the Society Assets app → Join society → enter this code → choose your flat.`
  );
}

/** Opens the system share sheet (WhatsApp, SMS, email, copy, etc.). */
export async function shareSocietyJoinInvite(societyName: string, rawJoinCode: string): Promise<void> {
  const message = buildSocietyJoinShareMessage(societyName, rawJoinCode);
  const title = `Join ${societyName} on Society Assets`;

  await Share.share(
    Platform.select({
      ios: { message, subject: title },
      default: { message, title },
    })!
  );
}

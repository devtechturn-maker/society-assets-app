import * as Sharing from 'expo-sharing';
import { downloadReportsToDevice, type ReportDownloadPayload } from '../services/api';

export async function openReportDownload(payload: ReportDownloadPayload): Promise<void> {
  const { uri, filename, mimeType } = await downloadReportsToDevice(payload);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(`${filename} saved, but sharing is not available on this device.`);
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'Society reports',
    UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : 'public.zip-archive',
  });
}

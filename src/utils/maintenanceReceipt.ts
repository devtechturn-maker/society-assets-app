import * as Sharing from 'expo-sharing';
import { downloadMemberMaintenanceReceipt } from '../services/api';

export async function openMemberMaintenanceReceipt(expenseId: string): Promise<void> {
  const fileUri = await downloadMemberMaintenanceReceipt(expenseId);
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Receipt saved, but sharing is not available on this device.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Maintenance receipt',
    UTI: 'com.adobe.pdf',
  });
}

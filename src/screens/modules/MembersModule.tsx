import { useState } from 'react';

import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import * as DocumentPicker from 'expo-document-picker';

import axios from 'axios';

import { AddMemberModal } from '../../components/members/AddMemberModal';

import { EditMemberModal } from '../../components/members/EditMemberModal';
import { ExcelValidationPreview } from '../../components/members/ExcelValidationPreview';

import { ListEmpty, ListError, ListLoading } from '../../components/dashboard/ListStates';

import { SectionCard } from '../../components/dashboard/SectionCard';

import { fetchMembers, uploadMembersExcel, validateMembersExcel } from '../../services/api';

import { useAppAlert } from '../../context/AppAlertContext';

import { useAsyncLoad } from '../../hooks/useAsyncLoad';

import { useTheme } from '../../theme/ThemeContext';

import { formatDateTime, formatInr } from '../../utils/format';

import type { MemberExcelValidation, SocietyMember } from '../../types/api';



export function MembersModule() {

  const { alert } = useAppAlert();

  const { theme } = useTheme();

  const [addModalOpen, setAddModalOpen] = useState(false);

  const [editingMember, setEditingMember] = useState<SocietyMember | null>(null);

  const [pickedFile, setPickedFile] = useState<{

    uri: string;

    name: string;

    mimeType: string | null;

  } | null>(null);

  const [excelValidation, setExcelValidation] = useState<MemberExcelValidation | null>(null);

  const [validating, setValidating] = useState(false);

  const [uploading, setUploading] = useState(false);



  const { data, loading, error, refreshing, refresh } = useAsyncLoad(fetchMembers, []);



  async function pickExcel() {

    try {

      const result = await DocumentPicker.getDocumentAsync({

        type: [

          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

          'application/vnd.ms-excel',

        ],

        copyToCacheDirectory: true,

        multiple: false,

      });

      if (result.canceled || !result.assets?.[0]) {

        return;

      }

      const asset = result.assets[0];

      const file = {
        uri: asset.uri,
        name: asset.name ?? 'members.xlsx',
        mimeType: asset.mimeType ?? null,
      };
      setPickedFile(file);
      setExcelValidation(null);
      await runExcelValidation(file);
    } catch {
      alert('File picker', 'Could not open file picker.', { variant: 'error' });
    }
  }

  async function runExcelValidation(file: { uri: string; name: string; mimeType: string | null }) {
    setValidating(true);
    try {
      const result = await validateMembersExcel(file.uri, file.name, file.mimeType);
      setExcelValidation(result);
      if (!result.summary.canImport && result.summary.invalid > 0) {
        alert(
          'Validation failed',
          `${result.summary.invalid} row(s) have errors. Fix the file and choose it again.`,
          { variant: 'error' }
        );
      }
    } catch (e: unknown) {
      setExcelValidation(null);
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
        : undefined;
      alert('Validation failed', msg ?? (e instanceof Error ? e.message : 'Unable to validate Excel'), {
        variant: 'error',
      });
    } finally {
      setValidating(false);
    }
  }



  async function uploadExcel() {

    if (!pickedFile) {

      alert('Choose file', 'Select an Excel file first (.xlsx or .xls).', { variant: 'warning' });

      return;

    }

    if (!excelValidation?.summary.canImport) {

      alert('Validate first', 'Validate Excel and fix all errors before importing.', { variant: 'warning' });

      return;

    }

    setUploading(true);

    try {

      const result = await uploadMembersExcel(pickedFile.uri, pickedFile.name, pickedFile.mimeType);

      alert('Import complete', `${result.added} member(s) added.`, { variant: 'success' });

      setPickedFile(null);

      setExcelValidation(null);

      refresh();

    } catch (e: unknown) {

      const msg = axios.isAxiosError(e)

        ? (e.response?.data as { message?: string } | undefined)?.message

        : undefined;

      alert('Upload failed', msg ?? (e instanceof Error ? e.message : 'Unable to upload Excel'), {

        variant: 'error',

      });

    } finally {

      setUploading(false);

    }

  }



  return (

    <>

      <ScrollView

        contentContainerStyle={[styles.scroll, { backgroundColor: theme.pageBg }]}

        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}

      >

        <SectionCard title="Add Member Manually" subtitle="Create one member at a time">

          <Pressable

            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}

            onPress={() => setAddModalOpen(true)}

          >

            <Text style={styles.primaryBtnText}>+ Add Member</Text>

          </Pressable>

        </SectionCard>



        <SectionCard

          title="Add Members with Excel"

          subtitle="Columns: name, email, flatNumber, phone, customMaintenance"

        >

          <Pressable
            style={[styles.fileBtn, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}
            onPress={pickExcel}
            disabled={validating || uploading}
          >
            <Text style={{ color: pickedFile ? theme.text : theme.placeholder, fontSize: 14 }}>
              {pickedFile ? pickedFile.name : 'Choose Excel file (.xlsx)'}
            </Text>
          </Pressable>
          {validating ? (
            <Text style={[styles.validatingText, { color: theme.textMuted }]}>Validating file…</Text>
          ) : null}
          {excelValidation?.summary.canImport ? (
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.accent, marginTop: 10 },
                uploading ? styles.disabled : null,
              ]}
              onPress={uploadExcel}
              disabled={uploading}
            >
              <Text style={styles.primaryBtnText}>{uploading ? 'Importing…' : '↑ Import Excel'}</Text>
            </Pressable>
          ) : null}

          {excelValidation ? <ExcelValidationPreview validation={excelValidation} /> : null}

        </SectionCard>



        <SectionCard title="Members List" subtitle="All members in this society">

          {loading ? <ListLoading /> : null}

          {error ? <ListError message={error} /> : null}

          {data?.length === 0 ? <ListEmpty message="No members yet." /> : null}

          {data?.map((m) => (

            <View key={m.id} style={[styles.card, { borderTopColor: theme.divider }]}>

              <View style={styles.cardHead}>

                <Text style={[styles.name, { color: theme.text }]}>{m.name}</Text>

                <Pressable onPress={() => setEditingMember(m)} hitSlop={8}>

                  <Text style={[styles.editLink, { color: theme.accent }]}>Edit</Text>

                </Pressable>

              </View>

              <Text style={[styles.email, { color: theme.textMuted }]}>{m.email}</Text>

              <Text style={[styles.meta, { color: theme.textSoft }]}>

                Flat {m.flatNumber} · {m.phone || '—'}

              </Text>

              {m.customMaintenanceAmount != null ? (

                <Text style={[styles.meta, { color: theme.textSoft }]}>

                  Custom maintenance {formatInr(m.customMaintenanceAmount)}

                </Text>

              ) : null}

              <Text style={[styles.created, { color: theme.textMuted }]}>

                Created {formatDateTime(m.createdAt)}

              </Text>

            </View>

          ))}

        </SectionCard>

      </ScrollView>



      <AddMemberModal

        visible={addModalOpen}

        onClose={() => setAddModalOpen(false)}

        onSaved={refresh}

      />

      <EditMemberModal

        visible={editingMember != null}

        member={editingMember}

        onClose={() => setEditingMember(null)}

        onSaved={refresh}

      />

    </>

  );

}



const styles = StyleSheet.create({

  scroll: { padding: 12, paddingBottom: 32 },

  primaryBtn: {

    paddingVertical: 12,

    borderRadius: 8,

    alignItems: 'center',

  },

  primaryBtnText: {

    color: '#fff',

    fontWeight: '700',

    fontSize: 14,

  },

  validatingText: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: 'italic',
  },
  fileBtn: {

    borderWidth: 1,

    borderRadius: 8,

    paddingHorizontal: 12,

    paddingVertical: 14,

  },

  disabled: { opacity: 0.55 },

  card: {

    borderTopWidth: 1,

    paddingVertical: 12,

    gap: 3,

  },

  cardHead: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

  },

  name: { fontSize: 16, fontWeight: '600', flex: 1 },

  editLink: { fontSize: 14, fontWeight: '700' },

  email: { fontSize: 12 },

  meta: { fontSize: 13 },

  created: { fontSize: 11, marginTop: 4 },

});



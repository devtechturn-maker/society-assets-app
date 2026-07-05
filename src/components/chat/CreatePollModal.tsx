import { useEffect, useState, type ReactNode } from 'react';

import {

  ActivityIndicator,

  KeyboardAvoidingView,

  Modal,

  Platform,

  Pressable,

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native';

import { useTheme } from '../../theme/ThemeContext';

import { DEFAULT_POLL_EXPIRY_MINUTES, POLL_EXPIRY_OPTIONS } from '../../utils/pollExpiry';



type Props = {

  visible: boolean;

  saving: boolean;

  onClose: () => void;

  onSubmit: (question: string, options: string[], expiresInMinutes: number) => void;

};



export function CreatePollModal({ visible, saving, onClose, onSubmit }: Props) {

  const { theme } = useTheme();

  const [question, setQuestion] = useState('');

  const [options, setOptions] = useState(['', '']);

  const [expiresInMinutes, setExpiresInMinutes] = useState(DEFAULT_POLL_EXPIRY_MINUTES);



  useEffect(() => {

    if (!visible) {

      setQuestion('');

      setOptions(['', '']);

      setExpiresInMinutes(DEFAULT_POLL_EXPIRY_MINUTES);

    }

  }, [visible]);



  function handleClose() {

    if (saving) return;

    onClose();

  }



  function handleSubmit() {

    onSubmit(question.trim(), options.map((option) => option.trim()).filter(Boolean), expiresInMinutes);

  }



  function updateOption(index: number, value: string) {

    setOptions((current) => current.map((row, i) => (i === index ? value : row)));

  }



  function removeOption(index: number) {

    if (options.length <= 2) return;

    setOptions((current) => current.filter((_, i) => i !== index));

  }



  return (

    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>

      <KeyboardAvoidingView

        style={styles.overlay}

        behavior={Platform.OS === 'ios' ? 'padding' : undefined}

      >

        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>

          <View style={[styles.sheetHead, { borderBottomColor: theme.divider }]}>

            <Pressable onPress={handleClose} hitSlop={12} disabled={saving}>

              <Text style={[styles.headAction, { color: theme.textMuted }]}>Cancel</Text>

            </Pressable>

            <Text style={[styles.sheetTitle, { color: theme.text }]}>Create poll</Text>

            <Pressable onPress={handleSubmit} hitSlop={12} disabled={saving}>

              {saving ? (

                <ActivityIndicator color={theme.accent} size="small" />

              ) : (

                <Text style={[styles.headAction, styles.headSend, { color: theme.accent }]}>Send</Text>

              )}

            </Pressable>

          </View>



          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>

            <Field label="Question" theme={theme}>

              <TextInput

                style={inputStyle(theme)}

                placeholder="Ask a question…"

                placeholderTextColor={theme.placeholder}

                value={question}

                onChangeText={setQuestion}

                maxLength={500}

                multiline

              />

            </Field>



            <Text style={[styles.optionsLabel, { color: theme.textMuted }]}>Options</Text>

            {options.map((option, index) => (

              <View key={`poll-option-${index}`} style={styles.optionRow}>

                <TextInput

                  style={[inputStyle(theme), styles.optionInput]}

                  placeholder={`Option ${index + 1}`}

                  placeholderTextColor={theme.placeholder}

                  value={option}

                  onChangeText={(value) => updateOption(index, value)}

                  maxLength={200}

                />

                {options.length > 2 ? (

                  <Pressable

                    style={[styles.removeBtn, { borderColor: theme.inputBorder }]}

                    onPress={() => removeOption(index)}

                    hitSlop={8}

                  >

                    <Text style={{ color: theme.textMuted, fontSize: 18, lineHeight: 20 }}>×</Text>

                  </Pressable>

                ) : null}

              </View>

            ))}



            {options.length < 12 ? (

              <Pressable

                style={styles.addOptionBtn}

                onPress={() => setOptions((current) => [...current, ''])}

              >

                <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 15 }}>+ Add option</Text>

              </Pressable>

            ) : null}



            <Text style={[styles.optionsLabel, { color: theme.textMuted }]}>Poll expires in</Text>

            <View style={styles.expiryRow}>

              {POLL_EXPIRY_OPTIONS.map((option) => {

                const selected = expiresInMinutes === option.minutes;

                return (

                  <Pressable

                    key={option.minutes}

                    style={[

                      styles.expiryChip,

                      {

                        backgroundColor: selected ? theme.accentSoft : theme.chipBg,

                        borderColor: selected ? theme.accent : theme.cardBorder,

                      },

                    ]}

                    onPress={() => setExpiresInMinutes(option.minutes)}

                  >

                    <Text style={{ color: selected ? theme.accent : theme.text, fontWeight: '600', fontSize: 13 }}>

                      {option.label}

                    </Text>

                  </Pressable>

                );

              })}

            </View>



            <Text style={[styles.hint, { color: theme.textMuted }]}>

              Group members can pick one option until the poll expires.

            </Text>

          </ScrollView>

        </View>

      </KeyboardAvoidingView>

    </Modal>

  );

}



function Field({

  label,

  theme,

  children,

}: {

  label: string;

  theme: ReturnType<typeof useTheme>['theme'];

  children: ReactNode;

}) {

  return (

    <View style={styles.field}>

      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>

      {children}

    </View>

  );

}



function inputStyle(theme: ReturnType<typeof useTheme>['theme']) {

  return [

    styles.input,

    {

      borderColor: theme.inputBorder,

      backgroundColor: theme.inputBg,

      color: theme.inputText,

    },

  ];

}



const styles = StyleSheet.create({

  overlay: { flex: 1, justifyContent: 'flex-end' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },

  sheet: {

    maxHeight: '88%',

    borderTopLeftRadius: 16,

    borderTopRightRadius: 16,

    paddingBottom: Platform.OS === 'ios' ? 28 : 16,

  },

  sheetHead: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 16,

    paddingVertical: 14,

    borderBottomWidth: StyleSheet.hairlineWidth,

  },

  sheetTitle: { fontSize: 17, fontWeight: '700' },

  headAction: { fontSize: 16, fontWeight: '600', minWidth: 56 },

  headSend: { textAlign: 'right', fontWeight: '800' },

  form: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },

  field: { marginBottom: 16 },

  label: {

    fontSize: 11,

    textTransform: 'uppercase',

    letterSpacing: 0.8,

    fontWeight: '700',

    marginBottom: 6,

  },

  input: {

    borderWidth: 1,

    borderRadius: 10,

    paddingHorizontal: 12,

    paddingVertical: 11,

    fontSize: 16,

    minHeight: 48,

    textAlignVertical: 'top',

  },

  optionsLabel: {

    fontSize: 11,

    textTransform: 'uppercase',

    letterSpacing: 0.8,

    fontWeight: '700',

    marginBottom: 8,

  },

  optionRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

    marginBottom: 8,

  },

  optionInput: { flex: 1, minHeight: 44 },

  removeBtn: {

    width: 36,

    height: 36,

    borderRadius: 18,

    borderWidth: 1,

    alignItems: 'center',

    justifyContent: 'center',

  },

  addOptionBtn: { paddingVertical: 8, marginBottom: 8 },

  expiryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  expiryChip: {

    borderWidth: 1,

    borderRadius: 999,

    paddingHorizontal: 12,

    paddingVertical: 8,

  },

  hint: { fontSize: 13, lineHeight: 18, marginTop: 4 },

});


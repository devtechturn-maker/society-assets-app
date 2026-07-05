import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppLogoLoader } from '../AppLogoLoader';
import { WIZARD_ACCENT, wizardStyles as styles } from './wizardStyles';

type Props = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  /** 0–100; omit to hide progress bar */
  progress?: number;
  stepLabel?: string;
  heading?: string;
  subtitle?: string;
  error?: string | null;
  primaryLabel?: string;
  onPrimaryPress?: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  showPrimary?: boolean;
  /** When false, body is not scrollable (use for embedded FlatList). Default true. */
  bodyScroll?: boolean;
};

export function WizardShell({
  title,
  onBack,
  children,
  progress,
  stepLabel,
  heading,
  subtitle,
  error,
  primaryLabel = 'Next',
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
  showPrimary = true,
  bodyScroll = true,
}: Props) {
  const headerBlock = (
    <>
      {stepLabel ? <Text style={styles.stepCount}>{stepLabel}</Text> : null}
      {heading ? <Text style={styles.title}>{heading}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerRow}>
            <Pressable onPress={onBack} style={styles.backBtn} hitSlop={10}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
          {progress != null ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
            </View>
          ) : null}
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {bodyScroll ? (
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {headerBlock}
            {children}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flex]}>
            {headerBlock}
            <View style={styles.flex}>{children}</View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        )}

        {showPrimary && onPrimaryPress ? (
          <SafeAreaView style={styles.footerSafe}>
            <Pressable
              style={[styles.primaryBtn, (primaryLoading || primaryDisabled) && styles.primaryBtnDisabled]}
              onPress={onPrimaryPress}
              disabled={primaryLoading || primaryDisabled}
            >
              {primaryLoading ? (
                <AppLogoLoader size="sm" minimal />
              ) : (
                <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
              )}
            </Pressable>
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

export { WIZARD_ACCENT };

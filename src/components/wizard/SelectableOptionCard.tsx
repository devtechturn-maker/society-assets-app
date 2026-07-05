import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { wizardStyles as styles } from './wizardStyles';

type Props = {
  title: string;
  meta?: string;
  selected?: boolean;
  onPress: () => void;
  leading?: ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
};

export function SelectableOptionCard({
  title,
  meta,
  selected = false,
  onPress,
  leading,
  showChevron = false,
  disabled = false,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        selected && styles.optionCardSelected,
        pressed && styles.optionCardPressed,
        disabled && styles.primaryBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {leading ? <View style={{ marginRight: 12 }}>{leading}</View> : null}
      <View style={styles.optionBody}>
        <Text style={styles.optionTitle} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.optionMeta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {showChevron ? <Text style={styles.optionChevron}>›</Text> : null}
    </Pressable>
  );
}

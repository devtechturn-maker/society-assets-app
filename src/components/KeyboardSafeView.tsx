import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  View,
  type KeyboardAvoidingViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Android draws the app edge to edge, so the window no longer shrinks for the keyboard (adjustResize has no effect).
 * This view measures how much of itself the keyboard covers and pads its bottom by exactly that, which also stays
 * correct where the system does resize (the overlap is then 0).
 */
function AndroidKeyboardInset({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const ref = useRef<View>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      ref.current?.measureInWindow((_x, y, _w, h) => {
        setInset(Math.max(0, Math.round(y + h - e.endCoordinates.screenY)));
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return (
    <View ref={ref} style={[{ flex: 1 }, style, { paddingBottom: inset }]}>
      {children}
    </View>
  );
}

/** Wraps the whole app: content is pushed above the keyboard on every screen. */
export function KeyboardSafeView({ children }: { children?: ReactNode }) {
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }
  return <AndroidKeyboardInset>{children}</AndroidKeyboardInset>;
}

/**
 * Keyboard-aware container for content inside a Modal (a modal is its own window, outside the app-wide inset).
 * iOS keeps the standard padding behaviour.
 */
export function ModalKeyboardAvoidingView({ style, children, keyboardVerticalOffset, ...rest }: KeyboardAvoidingViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <RNKeyboardAvoidingView style={style} behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset} {...rest}>
        {children}
      </RNKeyboardAvoidingView>
    );
  }
  return <AndroidKeyboardInset style={style}>{children}</AndroidKeyboardInset>;
}

import { useCallback, useRef, useState, useEffect, type RefObject } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type ScrollView,
  View,
} from 'react-native';

/** Bottom tab bar height in SocietyShell — keep in sync when layout changes. */
export const BOTTOM_TAB_BAR_HEIGHT = 62;
const KEYBOARD_FIELD_GAP = 16;

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (event: KeyboardEvent) => setHeight(event.endCoordinates.height);
    const onHide = () => setHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

export function scrollFieldIntoView(
  scrollRef: RefObject<ScrollView | null>,
  fieldRef: RefObject<View | null>,
  scrollOffsetY: number,
  keyboardHeight: number,
  bottomInset = BOTTOM_TAB_BAR_HEIGHT,
) {
  const run = () => {
    const scroll = scrollRef.current;
    const field = fieldRef.current;
    if (!scroll || !field) return;

    scroll.measureInWindow((_scrollX, scrollY, _scrollW, scrollHeight) => {
      field.measureInWindow((_fieldX, fieldY, _fieldW, fieldHeight) => {
        const fieldBottom = fieldY + fieldHeight;
        const scrollBottom = scrollY + scrollHeight;
        const windowHeight = Dimensions.get('window').height;
        const keyboardBottom =
          keyboardHeight > 0 ? windowHeight - keyboardHeight - bottomInset : scrollBottom;
        const visibleBottom = keyboardHeight > 0 ? Math.min(scrollBottom, keyboardBottom) : scrollBottom;
        const overflow = fieldBottom - (visibleBottom - KEYBOARD_FIELD_GAP);

        if (overflow > 0) {
          scroll.scrollTo({ y: scrollOffsetY + overflow, animated: true });
        }
      });
    });
  };

  setTimeout(run, 50);
  setTimeout(run, 280);
}

export function useKeyboardAwareScroll(bottomInset = BOTTOM_TAB_BAR_HEIGHT) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeight = useKeyboardHeight();
  const keyboardScrollPadding = Math.max(0, keyboardHeight - bottomInset);

  const scrollToField = useCallback(
    (fieldRef: RefObject<View | null>) => {
      scrollFieldIntoView(scrollRef, fieldRef, scrollOffsetRef.current, keyboardHeight, bottomInset);
    },
    [keyboardHeight, bottomInset],
  );

  const onScrollOffset = useCallback((offsetY: number) => {
    scrollOffsetRef.current = offsetY;
  }, []);

  return {
    scrollRef,
    keyboardHeight,
    keyboardScrollPadding,
    scrollToField,
    onScrollOffset,
  };
}

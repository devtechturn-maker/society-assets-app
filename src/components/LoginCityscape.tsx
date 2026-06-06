import { StyleSheet, View } from 'react-native';

/** Decorative skyline silhouette for the login background. */
export function LoginCityscape() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.tower, styles.tower1]} />
      <View style={[styles.tower, styles.tower2]} />
      <View style={[styles.tower, styles.tower3]} />
      <View style={[styles.tower, styles.tower4]} />
      <View style={[styles.tower, styles.tower5]} />
      <View style={[styles.tower, styles.tower6]} />
      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  ground: {
    height: 48,
    backgroundColor: 'rgba(15, 40, 72, 0.55)',
  },
  tower: {
    position: 'absolute',
    bottom: 36,
    backgroundColor: 'rgba(30, 58, 95, 0.45)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tower1: { left: '4%', width: 28, height: 72 },
  tower2: { left: '14%', width: 36, height: 110 },
  tower3: { left: '26%', width: 22, height: 86 },
  tower4: { left: '52%', width: 40, height: 128 },
  tower5: { left: '68%', width: 30, height: 94 },
  tower6: { left: '82%', width: 44, height: 118 },
});

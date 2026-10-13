import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';

const HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;height:100%;background:#fff;touch-action:none;overflow:hidden}canvas{display:block;width:100%;height:100%}</style></head>
<body><canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');let drawing=false,dirty=false,last=null;
function size(){const r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;x.scale(d,d);x.lineWidth=2.6;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#0f172a';}
size();
function pt(e){const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
function start(e){e.preventDefault();drawing=true;last=pt(e);}
function move(e){if(!drawing)return;e.preventDefault();const p=pt(e);x.beginPath();x.moveTo(last.x,last.y);x.lineTo(p.x,p.y);x.stroke();last=p;dirty=true;}
function end(){drawing=false;}
c.addEventListener('touchstart',start,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',end);
c.addEventListener('mousedown',start);c.addEventListener('mousemove',move);c.addEventListener('mouseup',end);
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
window.clearPad=function(){x.clearRect(0,0,c.width,c.height);dirty=false;send({type:'cleared'});};
window.exportPad=function(){send(dirty?{type:'signature',data:c.toDataURL('image/png')}:{type:'empty'});};
</script></body></html>`;

/** Finger-drawn signature. {@code onSigned} receives a PNG data URL; {@code onEmpty} when nothing is drawn. */
export function SignaturePad({
  onSigned,
  onEmpty,
  submitLabel = 'Sign',
  disabled = false,
}: {
  onSigned: (pngDataUrl: string) => void;
  onEmpty: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const ref = useRef<WebView>(null);
  return (
    <View style={styles.wrap}>
      <View style={[styles.pad, { borderColor: theme.cardBorder }]}>
        <WebView
          ref={ref}
          originWhitelist={['*']}
          source={{ html: HTML }}
          scrollEnabled={false}
          javaScriptEnabled
          onMessage={(e) => {
            try {
              const msg = JSON.parse(e.nativeEvent.data);
              if (msg.type === 'signature') onSigned(msg.data);
              else if (msg.type === 'empty') onEmpty();
            } catch {
              onEmpty();
            }
          }}
        />
        <Text style={[styles.hint, { color: theme.textMuted }]} pointerEvents="none">
          Sign above the line
        </Text>
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={() => ref.current?.injectJavaScript('window.clearPad();true;')}
          style={[styles.secondary, { borderColor: theme.cardBorder }]}
        >
          <Text style={{ color: theme.text, fontWeight: '700' }}>Clear</Text>
        </Pressable>
        <Pressable
          disabled={disabled}
          onPress={() => ref.current?.injectJavaScript('window.exportPad();true;')}
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.primaryText}>{submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  pad: { height: 200, borderWidth: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  hint: { position: 'absolute', bottom: 8, left: 12, fontSize: 11 },
  row: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primary: { flex: 2, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

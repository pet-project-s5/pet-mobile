import { useEffect, useRef, useState } from 'react';
import {
  Animated, Modal, Platform, Pressable, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { FlipHorizontal2, FlipVertical2, ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react-native';

// ─── Web: bake transforms on a canvas ─────────────────────────────────────────
function applyTransformsWeb(uri, flipH, flipV, scale, offsetX, offsetY) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const SIZE = 600; // output square
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.scale(
        (flipH ? -1 : 1) * scale,
        (flipV ? -1 : 1) * scale,
      );
      ctx.translate(-SIZE / 2 + offsetX / scale, -SIZE / 2 + offsetY / scale);
      // draw image centred
      const s = Math.max(SIZE / img.width, SIZE / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      ctx.drawImage(img, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
      ctx.restore();
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

// ─── Native: use expo-image-manipulator ───────────────────────────────────────
async function applyTransformsNative(uri, flipH, flipV) {
  if (!flipH && !flipV) return uri;
  try {
    const IM = await import('expo-image-manipulator');
    const actions = [];
    if (flipH) actions.push({ flip: IM.FlipType.Horizontal });
    if (flipV) actions.push({ flip: IM.FlipType.Vertical });
    const result = await IM.manipulateAsync(uri, actions, {
      compress: 0.88,
      format: IM.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

// ─── Grid overlay (rule of thirds) ────────────────────────────────────────────
function GridOverlay({ size }) {
  const t = size / 3;
  const t2 = (size * 2) / 3;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {/* Vertical lines */}
      <View style={[grid.line, { left: t, top: 0, width: 1, height: size }]} />
      <View style={[grid.line, { left: t2, top: 0, width: 1, height: size }]} />
      {/* Horizontal lines */}
      <View style={[grid.line, { top: t, left: 0, height: 1, width: size }]} />
      <View style={[grid.line, { top: t2, left: 0, height: 1, width: size }]} />
    </View>
  );
}
const grid = StyleSheet.create({
  line: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)' },
});

// ─── Main component ───────────────────────────────────────────────────────────
const FRAME = 290; // crop frame size in px
const MIN_SCALE = 1;
const MAX_SCALE = 3;
const STEP = 0.25;

export default function ImageEditModal({ visible, uri, onConfirm, onCancel }) {
  const [scale, setScale] = useState(1);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [saving, setSaving] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  // Reset when a new image is provided
  useEffect(() => {
    if (visible) {
      setScale(1); setFlipH(false); setFlipV(false);
      panX.setValue(0); panY.setValue(0);
      lastOffset.current = { x: 0, y: 0 };
    }
  }, [visible, uri]);

  // ── Web mouse drag ────────────────────────────────────────────────────────
  const dragRef = useRef(null);
  function onMouseDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: lastOffset.current.x, oy: lastOffset.current.y };
    const onMove = (ev) => {
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const nx = dragRef.current.ox + dx;
      const ny = dragRef.current.oy + dy;
      panX.setValue(nx);
      panY.setValue(ny);
      lastOffset.current = { x: nx, y: ny };
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ── Web wheel zoom ────────────────────────────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev - e.deltaY * 0.005)));
  }

  const zoomIn  = () => setScale(p => Math.min(MAX_SCALE, +(p + STEP).toFixed(2)));
  const zoomOut = () => setScale(p => Math.max(MIN_SCALE, +(p - STEP).toFixed(2)));
  const reset   = () => {
    setScale(1); setFlipH(false); setFlipV(false);
    panX.setValue(0); panY.setValue(0);
    lastOffset.current = { x: 0, y: 0 };
  };

  const confirm = async () => {
    setSaving(true);
    try {
      let result;
      if (Platform.OS === 'web') {
        result = await applyTransformsWeb(uri, flipH, flipV, scale, lastOffset.current.x, lastOffset.current.y);
      } else {
        result = await applyTransformsNative(uri, flipH, flipV);
      }
      onConfirm(result);
    } finally {
      setSaving(false);
    }
  };

  if (!uri) return null;

  const imageTransform = [
    { translateX: panX },
    { translateY: panY },
    { scale },
    { scaleX: flipH ? -1 : 1 },
    { scaleY: flipV ? -1 : 1 },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity onPress={onCancel} style={s.topBtn}>
              <X size={20} color="#DA524D" />
              <Text style={[s.topBtnText, { color: '#DA524D' }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>Editar foto</Text>
            <TouchableOpacity onPress={confirm} style={s.topBtn} disabled={saving}>
              <Check size={20} color="#2EC27E" />
              <Text style={[s.topBtnText, { color: '#2EC27E' }]}>
                {saving ? '...' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Crop frame */}
          <View
            style={s.frame}
            {...(Platform.OS === 'web' ? {
              onMouseDown,
              onWheel,
              style: [s.frame, { cursor: 'grab' }],
            } : {})}
          >
            <Animated.Image
              source={{ uri }}
              style={[s.image, { transform: imageTransform }]}
              resizeMode="cover"
            />
            <GridOverlay size={FRAME} />
            {/* Corner brackets */}
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy], i) => (
              <View key={i} style={[s.corner, {
                top:    sy < 0 ? 0 : undefined,
                bottom: sy > 0 ? 0 : undefined,
                left:   sx < 0 ? 0 : undefined,
                right:  sx > 0 ? 0 : undefined,
                borderTopWidth:    sy < 0 ? 3 : 0,
                borderBottomWidth: sy > 0 ? 3 : 0,
                borderLeftWidth:   sx < 0 ? 3 : 0,
                borderRightWidth:  sx > 0 ? 3 : 0,
              }]} />
            ))}
          </View>

          {/* Scale indicator */}
          <Text style={s.scaleLabel}>{Math.round(scale * 100)}%</Text>

          {/* Controls */}
          <View style={s.toolbar}>
            <ToolBtn icon={<FlipHorizontal2 size={20} color={flipH ? '#1E93AD' : '#5FAFC2'} />}
              label="Flip H" active={flipH} onPress={() => setFlipH(p => !p)} />
            <ToolBtn icon={<FlipVertical2 size={20} color={flipV ? '#1E93AD' : '#5FAFC2'} />}
              label="Flip V" active={flipV} onPress={() => setFlipV(p => !p)} />
            <ToolBtn icon={<ZoomOut size={20} color={scale <= MIN_SCALE ? '#B1DDE7' : '#5FAFC2'} />}
              label="−" onPress={zoomOut} disabled={scale <= MIN_SCALE} />
            <ToolBtn icon={<ZoomIn size={20} color={scale >= MAX_SCALE ? '#B1DDE7' : '#5FAFC2'} />}
              label="+" onPress={zoomIn} disabled={scale >= MAX_SCALE} />
            <ToolBtn icon={<RotateCcw size={20} color="#5FAFC2" />}
              label="Reset" onPress={reset} />
          </View>

          {Platform.OS === 'web' && (
            <Text style={s.hint}>Arraste para mover · Scroll para zoom</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ToolBtn({ icon, label, onPress, active, disabled }) {
  return (
    <TouchableOpacity
      style={[s.toolBtn, active && s.toolBtnActive, disabled && { opacity: 0.35 }]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon}
      <Text style={[s.toolLabel, active && { color: '#1E93AD' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1A2E38',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingBottom: 20,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 80 },
  topBtnText: { fontFamily: 'Kanit_700Bold', fontSize: 14 },
  topTitle: { fontFamily: 'Kanit_700Bold', color: '#E8F6FA', fontSize: 15 },
  frame: {
    width: FRAME, height: FRAME,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginVertical: 16,
    position: 'relative',
  },
  image: { width: FRAME, height: FRAME },
  corner: {
    position: 'absolute',
    width: 20, height: 20,
    borderColor: '#fff',
  },
  scaleLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#7ABFCF',
    fontSize: 12,
    marginBottom: 10,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  toolBtn: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 3,
  },
  toolBtnActive: { backgroundColor: 'rgba(30,147,173,0.2)' },
  toolLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 10,
  },
  hint: {
    fontFamily: 'Kanit_400Regular',
    color: '#4A7A8A',
    fontSize: 11,
    marginTop: 10,
  },
});

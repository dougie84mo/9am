import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { useApp } from '../context/AppContext';
import {
  formatClock,
  isWithinPhotoWindow,
  windowCountdown,
  windowLabel,
} from '../lib/time';
import { colors, radius, spacing } from '../theme';
import type { Photo } from '../types';

interface Props {
  onCapture: (photo: Photo) => void;
  onClose: () => void;
}

export function CameraScreen({ onCapture, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  // A ticking clock: re-renders every 10s so the lock screen's countdown stays
  // live and a card that opens at 9:59 locks itself at 10:00.
  const [now, setNow] = useState(() => new Date());
  const { isAdmin, windowBypass, setWindowBypass } = useApp();
  const [preview, setPreview] = useState<{ uri: string; exif?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // `windowBypass` is included so toggling it recomputes `open` immediately.
  const open = windowBypass || isWithinPhotoWindow(now);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const toggleBypass = (value: boolean) => {
    setWindowBypass(value);
    setNow(new Date());
  };

  const capture = async () => {
    // Guard again at the moment of capture — the window may have just closed.
    if (!isWithinPhotoWindow()) {
      setNow(new Date());
      return;
    }
    const cam = cameraRef.current;
    if (!cam) return;
    setBusy(true);
    try {
      // `exif: true` records the camera's capture metadata. DateTimeOriginal is
      // still device-clock-based (so it's evidence, not proof) — the trusted
      // check belongs server-side once a backend is wired in.
      const shot = await cam.takePictureAsync({ quality: 0.7, exif: true });
      if (shot?.uri) {
        const exifDate =
          (shot.exif?.DateTimeOriginal as string | undefined) ??
          (shot.exif?.['{Exif}']?.DateTimeOriginal as string | undefined);
        setPreview({ uri: shot.uri, exif: exifDate });
      }
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!preview) return;
    onCapture({
      uri: preview.uri,
      takenAt: new Date().toISOString(),
      exifDateTime: preview.exif,
    });
  };

  // ---- Locked outside the window -----------------------------------------
  if (!open) {
    return (
      <SafeAreaView style={styles.lockRoot}>
        <View style={styles.lockBody}>
          <Text style={styles.lockClock}>{formatClock(now)}</Text>
          <Text style={styles.lockEmoji}>🔒</Text>
          <Text style={styles.lockTitle}>The camera is asleep</Text>
          <Text style={styles.lockText}>
            9am only lets you take photos between {windowLabel()}. Real you,
            morning you — no touch-ups, no old favourites.
          </Text>
          <Text style={styles.lockCountdown}>Camera {windowCountdown(now)}</Text>

          {isAdmin && (
            <View style={styles.devBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.devTitle}>Developer: simulate 9 AM</Text>
                <Text style={styles.devHint}>
                  Bypasses the client lock. In backend mode the server still
                  enforces the real window on upload.
                </Text>
              </View>
              <Switch
                value={windowBypass}
                onValueChange={toggleBypass}
                trackColor={{ true: colors.secondary, false: '#caa' }}
              />
            </View>
          )}
        </View>
        <View style={styles.lockFooter}>
          <Button label="Go back" variant="outline" onPress={onClose} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Permission handling ------------------------------------------------
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.lockRoot}>
        <View style={styles.lockBody}>
          <Text style={styles.lockEmoji}>📷</Text>
          <Text style={styles.lockTitle}>Camera access needed</Text>
          <Text style={styles.lockText}>
            9am needs the camera because it is the only way to add a photo —
            uploads from your gallery are not allowed.
          </Text>
          <Button label="Allow camera" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
        </View>
        <View style={styles.lockFooter}>
          <Button label="Go back" variant="outline" onPress={onClose} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Captured-photo preview --------------------------------------------
  if (preview) {
    return (
      <SafeAreaView style={styles.previewRoot}>
        <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="cover" />
        <View style={styles.previewActions}>
          <Button
            label="Retake"
            variant="outline"
            onPress={() => setPreview(null)}
            style={{ flex: 1, backgroundColor: colors.card }}
          />
          <View style={{ width: spacing.md }} />
          <Button label="Use photo" onPress={confirm} style={{ flex: 1 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Live camera --------------------------------------------------------
  return (
    <View style={styles.cameraRoot}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.topBtn}>✕</Text>
          </Pressable>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.livePillText}>{formatClock()} · live only</Text>
          </View>
          <Pressable
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
            hitSlop={12}
          >
            <Text style={styles.topBtn}>⟲</Text>
          </Pressable>
        </View>

        <View style={styles.shutterRow}>
          <Pressable onPress={capture} disabled={busy} style={styles.shutterOuter}>
            {busy ? (
              <ActivityIndicator color={colors.secondary} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  // lock / permission
  lockRoot: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
  },
  lockBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  lockClock: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  lockEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  lockTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    textAlign: 'center',
  },
  lockText: {
    fontSize: 16,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  lockCountdown: {
    marginTop: spacing.lg,
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  devBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  devTitle: {
    fontWeight: '800',
    color: colors.ink,
    fontSize: 14,
  },
  devHint: {
    color: colors.inkSoft,
    fontSize: 12,
    marginTop: 2,
  },
  lockFooter: {
    padding: spacing.lg,
  },

  // live camera
  cameraRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  topBtn: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '700',
    width: 40,
    textAlign: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  livePillText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  shutterRow: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 5,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },

  // preview
  previewRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
});

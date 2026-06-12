import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  View,
} from 'react-native';
import { clamp, ratioFromValue, valueFromRatio } from '../lib/slider';
import { colors, radius } from '../theme';

const THUMB = 28;

const styles = StyleSheet.create({
  wrap: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(26,18,6,0.15)',
  },
  fill: {
    position: 'absolute',
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.secondary,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.secondary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

/**
 * Shared gesture wiring. The track children are `pointerEvents="none"` so the
 * wrap is always the touch target (keeps locationX consistent), movement is
 * driven by the gesture's accumulated dx (reliable), and we refuse termination
 * so a parent ScrollView can't steal the drag mid-slide.
 */
function useSliderResponder(
  onGrant: (startRatio: number) => void,
  onMove: (startRatio: number, dxRatio: number) => void,
  usableRef: React.MutableRefObject<number>,
) {
  const startRatio = useRef(0);
  return useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const usable = usableRef.current || 1;
          const r = clamp((evt.nativeEvent.locationX - THUMB / 2) / usable, 0, 1);
          startRatio.current = r;
          onGrant(r);
        },
        onPanResponderMove: (_evt, g: PanResponderGestureState) => {
          const usable = usableRef.current || 1;
          onMove(startRatio.current, g.dx / usable);
        },
      }),
    // refs + stable callbacks; recreated only if the callbacks identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

/** Single-thumb slider. Tap to jump, then drag to fine-tune. */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const usableRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const cfg = useRef({ min, max, step });
  cfg.current = { min, max, step };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    usableRef.current = Math.max(1, w - THUMB);
    setWidth(w);
  };

  const emit = (ratio: number) => {
    const { min: lo, max: hi, step: st } = cfg.current;
    onChangeRef.current(valueFromRatio(ratio, lo, hi, st));
  };

  const responder = useSliderResponder(
    (r) => emit(r),
    (start, d) => emit(start + d),
    usableRef,
  );

  const left = ratioFromValue(value, min, max) * Math.max(0, width - THUMB);

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={styles.track} pointerEvents="none" />
      <View style={[styles.fill, { width: left + THUMB / 2 }]} pointerEvents="none" />
      <View style={[styles.thumb, { left }]} pointerEvents="none" />
    </View>
  );
}

/** Two-thumb range slider. Grabs whichever thumb is nearer the touch. */
export function RangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const usableRef = useRef(0);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const cfg = useRef({ min, max, step });
  cfg.current = { min, max, step };
  const active = useRef<'low' | 'high'>('low');

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    usableRef.current = Math.max(1, w - THUMB);
    setWidth(w);
  };

  const apply = (ratio: number) => {
    const { min: lo, max: hi, step: st } = cfg.current;
    const v = valueFromRatio(ratio, lo, hi, st);
    if (active.current === 'low') {
      onChangeRef.current(Math.min(v, highRef.current - st), highRef.current);
    } else {
      onChangeRef.current(lowRef.current, Math.max(v, lowRef.current + st));
    }
  };

  const responder = useSliderResponder(
    (r) => {
      // Pick the nearer thumb to the touch, then move it there.
      const { min: lo, max: hi, step: st } = cfg.current;
      const v = valueFromRatio(r, lo, hi, st);
      if (v <= lowRef.current) active.current = 'low';
      else if (v >= highRef.current) active.current = 'high';
      else active.current = v - lowRef.current <= highRef.current - v ? 'low' : 'high';
      apply(r);
    },
    (start, d) => apply(start + d),
    usableRef,
  );

  const usable = Math.max(0, width - THUMB);
  const lowLeft = ratioFromValue(low, min, max) * usable;
  const highLeft = ratioFromValue(high, min, max) * usable;

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={styles.track} pointerEvents="none" />
      <View
        style={[styles.fill, { left: lowLeft + THUMB / 2, width: Math.max(0, highLeft - lowLeft) }]}
        pointerEvents="none"
      />
      <View style={[styles.thumb, { left: lowLeft }]} pointerEvents="none" />
      <View style={[styles.thumb, { left: highLeft }]} pointerEvents="none" />
    </View>
  );
}

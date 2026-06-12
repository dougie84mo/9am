import React, { useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import { ratioFromValue, valueFromRatio } from '../lib/slider';
import { colors, radius } from '../theme';

const THUMB = 28;

const styles = StyleSheet.create({
  wrap: {
    height: 40,
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

/** Single-thumb slider. Tap or drag anywhere on the track. */
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

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    usableRef.current = Math.max(0, w - THUMB);
    setWidth(w);
  };

  const update = (evt: GestureResponderEvent) => {
    const usable = usableRef.current;
    if (!usable) return;
    const x = evt.nativeEvent.locationX - THUMB / 2;
    onChangeRef.current(valueFromRatio(x / usable, min, max, step));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: update,
        onPanResponderMove: update,
      }),
    // update closes over min/max/step which are stable per render set
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step],
  );

  const left = ratioFromValue(value, min, max) * Math.max(0, width - THUMB);

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={styles.track} />
      <View style={[styles.fill, { width: left + THUMB / 2 }]} />
      <View style={[styles.thumb, { left }]} />
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
  const active = useRef<'low' | 'high'>('low');

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    usableRef.current = Math.max(0, w - THUMB);
    setWidth(w);
  };

  const valueAt = (evt: GestureResponderEvent) => {
    const usable = usableRef.current;
    const x = evt.nativeEvent.locationX - THUMB / 2;
    return valueFromRatio(usable ? x / usable : 0, min, max, step);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const v = valueAt(evt);
          // Pick the thumb to drag: outside the range grabs the near end,
          // otherwise the closer thumb.
          if (v <= lowRef.current) active.current = 'low';
          else if (v >= highRef.current) active.current = 'high';
          else {
            active.current =
              v - lowRef.current <= highRef.current - v ? 'low' : 'high';
          }
        },
        onPanResponderMove: (evt) => {
          const v = valueAt(evt);
          if (active.current === 'low') {
            onChangeRef.current(Math.min(v, highRef.current - step), highRef.current);
          } else {
            onChangeRef.current(lowRef.current, Math.max(v, lowRef.current + step));
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step],
  );

  const usable = Math.max(0, width - THUMB);
  const lowLeft = ratioFromValue(low, min, max) * usable;
  const highLeft = ratioFromValue(high, min, max) * usable;

  return (
    <View style={styles.wrap} onLayout={onLayout} {...responder.panHandlers}>
      <View style={styles.track} />
      <View
        style={[styles.fill, { left: lowLeft + THUMB / 2, width: Math.max(0, highLeft - lowLeft) }]}
      />
      <View style={[styles.thumb, { left: lowLeft }]} />
      <View style={[styles.thumb, { left: highLeft }]} />
    </View>
  );
}

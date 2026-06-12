import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  clearLocationCache,
  resolveLocation,
  type ResolvedLocation,
} from '../lib/location';
import { colors, fonts, radius, spacing } from '../theme';
import { Button } from './Button';

type Status = 'checking' | 'granted' | 'denied' | 'undetermined';

/** "America/New_York" → "New York" — a friendly label for the raw IANA zone. */
function prettyZone(tz: string): string {
  const city = tz.split('/').pop() ?? tz;
  return city.replace(/_/g, ' ');
}

/** Current wall-clock time in the given IANA zone, e.g. "9:42 AM". */
function zoneClock(tz: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return null;
  }
}

/**
 * Location services panel for the profile editor. Shows whether location is
 * connected, the exact area the user is in (reverse-geocoded city/region), the
 * timezone that drives the 9–10am window, and a combined warning when the
 * profile won't be visible in the deck — i.e. location off OR no photos.
 */
export function LocationCard({ photoCount }: { photoCount: number }) {
  const [status, setStatus] = useState<Status>('checking');
  const [loc, setLoc] = useState<ResolvedLocation | null>(null);
  const [busy, setBusy] = useState(false);
  // Re-render once a minute so the live timezone clock stays current.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!alive) return;
        if (perm.status === 'granted') {
          setStatus('granted');
          const resolved = await resolveLocation();
          if (alive) setLoc(resolved);
        } else {
          setStatus(perm.status === 'denied' ? 'denied' : 'undetermined');
        }
      } catch {
        if (alive) setStatus('undetermined');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === 'granted') {
        clearLocationCache(); // re-detect now that we're allowed
        setStatus('granted');
        setLoc(await resolveLocation());
      } else {
        setStatus('denied');
      }
    } finally {
      setBusy(false);
    }
  };

  const connected = status === 'granted';
  const noPhoto = photoCount === 0;
  const invisible = !connected || noPhoto;

  const areaText = !connected
    ? 'Unknown'
    : loc
      ? (loc.place ?? prettyZone(loc.timezone)) // geocode fell back to zone city
      : 'Locating…';

  const tz = connected ? loc?.timezone ?? null : null;
  const clock = tz ? zoneClock(tz) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Location</Text>

      <View style={styles.statusRow}>
        <View style={[styles.dot, connected ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.statusText}>
          {status === 'checking'
            ? 'Checking…'
            : connected
              ? 'Location connected'
              : 'Location not connected'}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Your area</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {areaText}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Time zone</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {tz ? `${prettyZone(tz)}${clock ? ` · ${clock}` : ''}` : 'Unknown'}
        </Text>
      </View>

      {!connected && status !== 'checking' && (
        <Button
          label="Enable location"
          onPress={enable}
          loading={busy}
          style={{ marginTop: spacing.md }}
        />
      )}

      {invisible && (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            ⚠️ You won't be shown to anyone until you{' '}
            {!connected ? 'turn on location services' : ''}
            {!connected && noPhoto ? ' and ' : ''}
            {noPhoto ? 'add at least one morning photo' : ''}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Mirrors the editor's card idiom in ProfileScreen.
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.white,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    textTransform: 'uppercase',
    borderBottomWidth: 3,
    borderBottomColor: colors.secondary,
    alignSelf: 'flex-start',
    paddingBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: colors.like,
  },
  dotOff: {
    backgroundColor: colors.inkSoft,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
  warn: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(254,32,0,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(254,32,0,0.35)',
    padding: spacing.md,
  },
  warnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 19,
  },
});

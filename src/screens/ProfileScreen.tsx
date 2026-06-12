import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ChoiceChips } from '../components/ChoiceChips';
import { InterestSelect } from '../components/InterestSelect';
import { LocationCard } from '../components/LocationCard';
import { PhotoView } from '../components/PhotoView';
import { PromptPicker } from '../components/PromptPicker';
import { Slider, RangeSlider } from '../components/Slider';
import { useApp } from '../context/AppContext';
import { resolveInterests } from '../lib/interests';
import {
  AGE_CEILING,
  AGE_FLOOR,
  DISTANCE_CEILING,
  DISTANCE_FLOOR,
  GENDERS,
  HAS_KIDS,
  WANTS_KIDS,
  type Gender,
  type HasKids,
  type WantsKids,
} from '../lib/profileFields';
import { formatClock, windowCountdown, windowLabel } from '../lib/time';
import { colors, fill, fonts, radius, spacing } from '../theme';
import type { ProfilePrompt } from '../types';
import { CameraScreen } from './CameraScreen';

const BIO_MAX = 300;

export function ProfileScreen() {
  const {
    profile,
    updateProfile,
    uploadCapturedPhoto,
    removePhoto: deleteRemotePhoto,
    signOut,
    isAdmin,
    devModeEnabled,
    setDevMode,
    windowBypass,
    setWindowBypass,
    resetDeck,
    respoofMocksNearMe,
  } = useApp();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [respoofing, setRespoofing] = useState(false);

  // Editor draft state.
  const [dBio, setDBio] = useState('');
  const [dGender, setDGender] = useState<Gender | null>(null);
  const [dProfession, setDProfession] = useState('');
  const [dHasKids, setDHasKids] = useState<HasKids | null>(null);
  const [dWantsKids, setDWantsKids] = useState<WantsKids | null>(null);
  const [dPreferred, setDPreferred] = useState<Gender[]>([]);
  const [dAgeMin, setDAgeMin] = useState(AGE_FLOOR);
  const [dAgeMax, setDAgeMax] = useState(AGE_CEILING);
  const [dDistance, setDDistance] = useState(50);
  const [dAnywhere, setDAnywhere] = useState(false);
  const [dPrompts, setDPrompts] = useState<ProfilePrompt[]>([]);
  const [dInterests, setDInterests] = useState<string[]>([]);

  if (!profile) return null;

  const openEditor = () => {
    setDBio(profile.bio);
    setDGender(profile.gender);
    setDProfession(profile.profession);
    setDHasKids(profile.hasKids);
    setDWantsKids(profile.wantsKids);
    setDPreferred(profile.preferredGenders);
    setDAgeMin(profile.ageMin);
    setDAgeMax(profile.ageMax);
    setDAnywhere(profile.maxDistance == null);
    setDDistance(profile.maxDistance ?? 50);
    setDPrompts(profile.prompts);
    setDInterests(profile.interests);
    setEditing(true);
  };

  const saveEditor = () => {
    // The sliders already keep these in-range and ordered (min ≤ max).
    void updateProfile({
      bio: dBio.trim(),
      gender: dGender,
      profession: dProfession.trim(),
      hasKids: dHasKids,
      wantsKids: dWantsKids,
      preferredGenders: dPreferred,
      ageMin: dAgeMin,
      ageMax: dAgeMax,
      maxDistance: dAnywhere ? null : dDistance,
      prompts: dPrompts.filter((p) => p.answer.trim().length > 0),
      interests: dInterests,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.editorTopBar}>
          <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          <Button label="Save" onPress={saveEditor} />
        </View>
        <ScrollView
          contentContainerStyle={styles.editorScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About you</Text>

            <Text style={[styles.editLabel, styles.editLabelFirst]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={dBio}
              onChangeText={(t) => setDBio(t.slice(0, BIO_MAX))}
              placeholder="Say something real — what's your morning actually like?"
              placeholderTextColor={colors.inkSoft}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>
              {dBio.length}/{BIO_MAX}
            </Text>

            <Text style={styles.editLabel}>I am a</Text>
            <ChoiceChips
              options={GENDERS}
              selected={dGender ? [dGender] : []}
              onChange={(v) => setDGender((v[0] as Gender) ?? null)}
            />

            <Text style={styles.editLabel}>Profession</Text>
            <TextInput
              style={styles.input}
              value={dProfession}
              onChangeText={setDProfession}
              placeholder="What do you do?"
              placeholderTextColor={colors.inkSoft}
            />

            <Text style={styles.editLabel}>Children — have</Text>
            <ChoiceChips
              options={HAS_KIDS}
              selected={dHasKids ? [dHasKids] : []}
              onChange={(v) => setDHasKids((v[0] as HasKids) ?? null)}
            />

            <Text style={styles.editLabel}>Children — want</Text>
            <ChoiceChips
              options={WANTS_KIDS}
              selected={dWantsKids ? [dWantsKids] : []}
              onChange={(v) => setDWantsKids((v[0] as WantsKids) ?? null)}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Who you'll see</Text>

            <Text style={[styles.editLabel, styles.editLabelFirst]}>Show me</Text>
            <ChoiceChips
              options={GENDERS}
              selected={dPreferred}
              onChange={(v) => setDPreferred(v as Gender[])}
              multi
            />

            <View style={styles.sliderLabelRow}>
              <Text style={[styles.editLabel, styles.sliderLabelText]}>Age range</Text>
              <Text style={styles.sliderValue}>
                {dAgeMin}–{dAgeMax}
              </Text>
            </View>
            <RangeSlider
              min={AGE_FLOOR}
              max={AGE_CEILING}
              low={dAgeMin}
              high={dAgeMax}
              onChange={(lo, hi) => {
                setDAgeMin(lo);
                setDAgeMax(hi);
              }}
            />

            <View style={styles.sliderLabelRow}>
              <Text style={[styles.editLabel, styles.sliderLabelText]}>Maximum distance</Text>
              <Pressable
                onPress={() => setDAnywhere((a) => !a)}
                style={[styles.anyChip, dAnywhere && styles.anyChipOn]}
              >
                <Text style={[styles.anyChipText, dAnywhere && styles.anyChipTextOn]}>
                  Anywhere
                </Text>
              </Pressable>
            </View>
            {dAnywhere ? (
              <Text style={styles.distAnywhereNote}>
                Showing matches at any distance.
              </Text>
            ) : (
              <>
                <Text style={styles.sliderValue}>
                  {dDistance} {dDistance === 1 ? 'mile' : 'miles'}
                </Text>
                <Slider
                  min={DISTANCE_FLOOR}
                  max={DISTANCE_CEILING}
                  value={dDistance}
                  onChange={setDDistance}
                />
              </>
            )}
          </View>

          <LocationCard photoCount={profile.photos.length} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prompts</Text>
            <View style={{ marginTop: spacing.sm }}>
              <PromptPicker value={dPrompts} onChange={setDPrompts} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interests</Text>
            <View style={{ marginTop: spacing.sm }}>
              <InterestSelect selected={dInterests} onChange={setDInterests} />
            </View>
          </View>
        </ScrollView>
        <View style={styles.editorFooter}>
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => setEditing(false)}
            style={{ flex: 1 }}
          />
          <View style={{ width: spacing.md }} />
          <Button label="Save" onPress={saveEditor} style={{ flex: 1 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (cameraOpen) {
    return (
      <CameraScreen
        onClose={() => setCameraOpen(false)}
        onCapture={async (p) => {
          setCameraOpen(false);
          try {
            const stored = await uploadCapturedPhoto(p.uri, profile.photos.length);
            await updateProfile({ photos: [...profile.photos, stored] });
          } catch (e) {
            Alert.alert(
              'Photo not added',
              e instanceof Error ? e.message : 'Could not save that photo.',
            );
          }
        }}
      />
    );
  }

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const removePhoto = (idx: number) => {
    if (profile.photos.length <= 1) {
      Alert.alert('Keep at least one', 'Your profile needs at least one photo.');
      return;
    }
    const target = profile.photos[idx];
    void updateProfile({ photos: profile.photos.filter((_, i) => i !== idx) });
    void deleteRemotePhoto(target.uri);
  };

  const hero = profile.photos[0];
  const attributes = [
    profile.gender,
    profile.profession,
    profile.hasKids,
    profile.wantsKids,
  ].filter((a): a is string => Boolean(a));

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroWrap}>
          <PhotoView photo={hero} name={profile.name} style={styles.hero} initialSize={96} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>
              {profile.name}, {profile.age}
            </Text>
            <Text style={styles.heroStamp}>
              {hero
                ? `📷 morning photo · ${formatClock(new Date(hero.takenAt))}`
                : `📷 add a morning photo (${windowLabel()})`}
            </Text>
          </View>
        </View>

        {attributes.length > 0 && (
          <View style={styles.attrRow}>
            {attributes.map((a) => (
              <View key={a} style={styles.attrPill}>
                <Text style={styles.attrPillText}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {profile.bio.length > 0 && <Text style={styles.bio}>{profile.bio}</Text>}

        <Button
          label="Edit profile"
          variant="outline"
          onPress={openEditor}
          style={{ marginTop: spacing.lg }}
        />

        {profile.prompts.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Prompts</Text>
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {profile.prompts.map((p) => (
                <View key={p.prompt} style={styles.promptCard}>
                  <Text style={styles.promptQ}>{p.prompt}</Text>
                  <Text style={styles.promptA}>{p.answer}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Interests</Text>
        {profile.interests.length === 0 ? (
          <Text style={styles.sectionHint}>
            Add interests so we can match you on what you have in common.
          </Text>
        ) : (
          <View style={styles.interestChips}>
            {resolveInterests(profile.interests).map((it) => (
              <View key={it.id} style={styles.interestChip}>
                <Text style={styles.interestChipText}>{it.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Your photos</Text>
        <Text style={styles.sectionHint}>
          {profile.photos.length === 0
            ? "You won't appear in the deck until you add a morning photo. "
            : ''}
          Camera {windowCountdown()} · only usable {windowLabel()}
        </Text>

        <View style={styles.grid}>
          {profile.photos.map((p, i) => (
            <View key={i} style={styles.thumbWrap}>
              <PhotoView photo={p} name={profile.name} style={styles.thumb} initialSize={52} />
              <Text style={styles.thumbStamp}>{formatClock(new Date(p.takenAt))}</Text>
              <Pressable style={styles.thumbRemove} onPress={() => removePhoto(i)} hitSlop={8}>
                <Text style={styles.thumbRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {profile.photos.length < 6 && (
            <Pressable style={styles.addTile} onPress={() => setCameraOpen(true)}>
              <Text style={styles.addPlus}>＋</Text>
              <Text style={styles.addText}>Take photo</Text>
            </Pressable>
          )}
        </View>

        {isAdmin && (
          <View style={styles.devSection}>
            <View style={styles.devHeaderRow}>
              <Text style={styles.devTitle}>Developer mode</Text>
              <Switch
                value={devModeEnabled}
                onValueChange={setDevMode}
                trackColor={{ true: colors.secondary, false: '#caa' }}
              />
            </View>
            {devModeEnabled && (
              <View style={styles.devBox}>
                <View style={styles.devRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.devLabel}>Bypass 9–10am camera lock</Text>
                    <Text style={styles.devHint}>
                      Client only — in backend mode the server still enforces the
                      window on upload.
                    </Text>
                  </View>
                  <Switch
                    value={windowBypass}
                    onValueChange={setWindowBypass}
                    trackColor={{ true: colors.secondary, false: '#caa' }}
                  />
                </View>
                <Button
                  label="Reset deck / clear my swipes"
                  variant="outline"
                  onPress={resetDeck}
                  style={{ marginTop: spacing.md }}
                />
                <Text style={styles.devHint}>
                  Scatter the mock profiles within ~50 miles of where you are now,
                  so the distance filter has local matches.
                </Text>
                <Button
                  label="Place mock profiles near me"
                  variant="outline"
                  loading={respoofing}
                  onPress={async () => {
                    setRespoofing(true);
                    try {
                      const moved = await respoofMocksNearMe();
                      Alert.alert('Done', `Moved ${moved} mock profiles near you.`);
                    } catch (e) {
                      Alert.alert(
                        'Could not move profiles',
                        e instanceof Error ? e.message : 'Try again.',
                      );
                    } finally {
                      setRespoofing(false);
                    }
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </View>
        )}

        <Button
          label="Sign out"
          variant="outline"
          onPress={confirmSignOut}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  heroWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: colors.white,
  },
  hero: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.inkSoft,
  },
  heroInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  heroName: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 28,
  },
  heroStamp: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  attrRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  attrPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  attrPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  bio: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 22,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginTop: spacing.xl,
    textTransform: 'uppercase',
  },
  interestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  interestChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  interestChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  promptCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  promptQ: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  promptA: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 4,
    lineHeight: 23,
  },
  // editor
  editorTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  editorScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
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
    // Red underline accent ties the section headers to the Bad Friends identity.
    borderBottomWidth: 3,
    borderBottomColor: colors.secondary,
    alignSelf: 'flex-start',
    paddingBottom: 2,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  editLabelFirst: {
    marginTop: spacing.md,
  },
  bioInput: {
    minHeight: 96,
    paddingTop: 12,
    lineHeight: 22,
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inkSoft,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  input: {
    // Gold fill so fields read as distinct "wells" against the cream card
    // (matches the interest search box).
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  sliderLabelText: {
    marginTop: 0,
    marginBottom: 0,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.secondary,
  },
  distAnywhereNote: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  anyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  anyChipOn: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  anyChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
  },
  anyChipTextOn: {
    color: colors.white,
  },
  editorFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  devSection: {
    marginTop: spacing.xl,
  },
  devHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  devBox: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  devHint: {
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  thumbWrap: {
    width: '47%',
    aspectRatio: 0.8,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  thumb: {
    ...fill,
    width: undefined,
    height: undefined,
  },
  thumbStamp: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: colors.overlay,
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
  },
  addTile: {
    width: '47%',
    aspectRatio: 0.8,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(254,32,0,0.06)',
  },
  addPlus: {
    fontSize: 40,
    color: colors.secondary,
    fontWeight: '300',
    lineHeight: 44,
  },
  addText: {
    color: colors.secondary,
    fontWeight: '800',
    fontSize: 14,
  },
});

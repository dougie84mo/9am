import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ChoiceChips } from '../components/ChoiceChips';
import { InterestPicker } from '../components/InterestPicker';
import { PhotoView } from '../components/PhotoView';
import { PromptPicker } from '../components/PromptPicker';
import { useApp } from '../context/AppContext';
import { resolveInterests } from '../lib/interests';
import {
  AGE_CEILING,
  AGE_FLOOR,
  CHILDREN_STATUS,
  GENDERS,
  type ChildrenStatus,
  type Gender,
} from '../lib/profileFields';
import { formatClock, windowCountdown, windowLabel } from '../lib/time';
import { colors, fill, radius, spacing } from '../theme';
import type { ProfilePrompt } from '../types';
import { CameraScreen } from './CameraScreen';

export function ProfileScreen() {
  const {
    profile,
    updateProfile,
    resetEverything,
    uploadCapturedPhoto,
    removePhoto: deleteRemotePhoto,
    backendEnabled,
    signOut,
  } = useApp();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Editor draft state.
  const [dGender, setDGender] = useState<Gender | null>(null);
  const [dProfession, setDProfession] = useState('');
  const [dChildren, setDChildren] = useState<ChildrenStatus | null>(null);
  const [dPreferred, setDPreferred] = useState<Gender[]>([]);
  const [dAgeMin, setDAgeMin] = useState(String(AGE_FLOOR));
  const [dAgeMax, setDAgeMax] = useState(String(AGE_CEILING));
  const [dPrompts, setDPrompts] = useState<ProfilePrompt[]>([]);
  const [dInterests, setDInterests] = useState<string[]>([]);

  if (!profile) return null;

  const openEditor = () => {
    setDGender(profile.gender);
    setDProfession(profile.profession);
    setDChildren(profile.childrenStatus);
    setDPreferred(profile.preferredGenders);
    setDAgeMin(String(profile.ageMin));
    setDAgeMax(String(profile.ageMax));
    setDPrompts(profile.prompts);
    setDInterests(profile.interests);
    setEditing(true);
  };

  const saveEditor = () => {
    const clamp = (n: number, fallback: number) =>
      Number.isNaN(n) ? fallback : Math.max(AGE_FLOOR, Math.min(n, AGE_CEILING));
    let min = clamp(parseInt(dAgeMin, 10), AGE_FLOOR);
    let max = clamp(parseInt(dAgeMax, 10), AGE_CEILING);
    if (min > max) [min, max] = [max, min];

    void updateProfile({
      gender: dGender,
      profession: dProfession.trim(),
      childrenStatus: dChildren,
      preferredGenders: dPreferred,
      ageMin: min,
      ageMax: max,
      prompts: dPrompts.filter((p) => p.answer.trim().length > 0),
      interests: dInterests,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.editorHeader}>
          <Text style={styles.sectionTitleFlush}>Edit profile</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.editorScroll}
          keyboardShouldPersistTaps="handled"
        >
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

          <Text style={styles.editLabel}>Children</Text>
          <ChoiceChips
            options={CHILDREN_STATUS}
            selected={dChildren ? [dChildren] : []}
            onChange={(v) => setDChildren((v[0] as ChildrenStatus) ?? null)}
          />

          <Text style={styles.editLabel}>Show me</Text>
          <ChoiceChips
            options={GENDERS}
            selected={dPreferred}
            onChange={(v) => setDPreferred(v as Gender[])}
            multi
          />

          <Text style={styles.editLabel}>Age range</Text>
          <View style={styles.ageRow}>
            <TextInput
              style={[styles.input, styles.ageInput]}
              value={dAgeMin}
              onChangeText={(t) => setDAgeMin(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.ageDash}>to</Text>
            <TextInput
              style={[styles.input, styles.ageInput]}
              value={dAgeMax}
              onChangeText={(t) => setDAgeMax(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>

          <Text style={styles.editLabel}>Prompts</Text>
          <PromptPicker value={dPrompts} onChange={setDPrompts} />

          <Text style={styles.editLabel}>Interests</Text>
          <InterestPicker selected={dInterests} onChange={setDInterests} scroll={false} />
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

  const confirmReset = () => {
    Alert.alert(
      'Start over?',
      'This deletes your profile, photos and matches on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void resetEverything() },
      ],
    );
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
  const attributes = [profile.gender, profile.profession, profile.childrenStatus].filter(
    (a): a is string => Boolean(a),
  );

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
              📷 morning photo · {formatClock(new Date(hero.takenAt))}
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

        <Button
          label={backendEnabled ? 'Sign out' : 'Start over'}
          variant="outline"
          onPress={backendEnabled ? () => void signOut() : confirmReset}
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
    fontSize: 26,
    fontWeight: '900',
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
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
    marginTop: spacing.xl,
  },
  sectionTitleFlush: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.ink,
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
  editorHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  editorScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ageInput: {
    flex: 1,
    textAlign: 'center',
  },
  ageDash: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.inkSoft,
  },
  editorFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
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

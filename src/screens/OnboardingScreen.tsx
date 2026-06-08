import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { Logo } from '../components/Logo';
import { PromptPicker } from '../components/PromptPicker';
import { useApp } from '../context/AppContext';
import {
  AGE_CEILING,
  AGE_FLOOR,
  CHILDREN_STATUS,
  GENDERS,
  type ChildrenStatus,
  type Gender,
} from '../lib/profileFields';
import { formatClock, windowLabel } from '../lib/time';
import { colors, fill, radius, spacing } from '../theme';
import type { Photo, ProfilePrompt } from '../types';
import { CameraScreen } from './CameraScreen';

type Step = 'welcome' | 'details' | 'preferences' | 'prompts' | 'photos' | 'interests';

export function OnboardingScreen() {
  const { createProfile, uploadCapturedPhoto, removePhoto } = useApp();
  const [step, setStep] = useState<Step>('welcome');
  const [cameraOpen, setCameraOpen] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [profession, setProfession] = useState('');
  const [childrenStatus, setChildrenStatus] = useState<ChildrenStatus | null>(null);
  const [preferredGenders, setPreferredGenders] = useState<Gender[]>([]);
  const [ageMin, setAgeMin] = useState(String(AGE_FLOOR));
  const [ageMax, setAgeMax] = useState(String(AGE_CEILING));
  const [prompts, setPrompts] = useState<ProfilePrompt[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const ageNum = parseInt(age, 10);
  const detailsValid =
    name.trim().length >= 2 && ageNum >= 18 && ageNum < 120 && gender !== null;

  const ageMinNum = parseInt(ageMin, 10);
  const ageMaxNum = parseInt(ageMax, 10);
  const prefsValid =
    ageMinNum >= AGE_FLOOR && ageMaxNum <= AGE_CEILING && ageMinNum <= ageMaxNum;

  const finish = async () => {
    setSubmitting(true);
    try {
      await createProfile({
        name,
        age: ageNum,
        bio,
        photos,
        interests,
        gender,
        profession,
        childrenStatus,
        prompts,
        preferredGenders,
        ageMin: ageMinNum,
        ageMax: ageMaxNum,
      });
      // The root navigator swaps to the main app once profile exists.
    } finally {
      setSubmitting(false);
    }
  };

  if (cameraOpen) {
    return (
      <CameraScreen
        onClose={() => setCameraOpen(false)}
        onCapture={async (p) => {
          setCameraOpen(false);
          try {
            const stored = await uploadCapturedPhoto(p.uri, photos.length);
            setPhotos((prev) => [...prev, stored]);
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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'welcome' && (
            <View style={styles.welcome}>
              <Logo size={88} />
              <Text style={styles.tagline}>Dating for who you really are.</Text>

              <View style={styles.rules}>
                <Rule
                  emoji="📷"
                  title="No uploads, ever"
                  text="Every photo is taken live, right here in the app. No camera roll, no old highlights."
                />
                <Rule
                  emoji="⏰"
                  title={`Camera opens ${windowLabel()}`}
                  text="You can only snap your photos in the morning window. Bedhead and all — that's the point."
                />
                <Rule
                  emoji="💛"
                  title="Then swipe like normal"
                  text="Once you've got your morning shots, it works just like any other dating app."
                />
              </View>

              <Button
                label="Get started"
                onPress={() => setStep('details')}
                style={{ alignSelf: 'stretch', marginTop: spacing.xl }}
              />
            </View>
          )}

          {step === 'details' && (
            <View>
              <Text style={styles.h1}>About you</Text>
              <Text style={styles.sub}>The basics. Keep it honest.</Text>

              <Field label="First name">
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Alex"
                  placeholderTextColor={colors.inkSoft}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </Field>

              <Field label="Age">
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                  placeholder="28"
                  placeholderTextColor={colors.inkSoft}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                {age.length > 0 && ageNum < 18 && (
                  <Text style={styles.error}>You must be 18 or older.</Text>
                )}
              </Field>

              <Field label="Bio">
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="What should people know about morning you?"
                  placeholderTextColor={colors.inkSoft}
                  multiline
                  maxLength={240}
                />
                <Text style={styles.counter}>{bio.length}/240</Text>
              </Field>

              <Field label="I am a">
                <ChoiceChips
                  options={GENDERS}
                  selected={gender ? [gender] : []}
                  onChange={(v) => setGender((v[0] as Gender) ?? null)}
                />
              </Field>

              <Button
                label="Next: preferences"
                onPress={() => setStep('preferences')}
                disabled={!detailsValid}
                style={{ marginTop: spacing.md }}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep('welcome')}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {step === 'preferences' && (
            <View>
              <Text style={styles.h1}>A bit more</Text>
              <Text style={styles.sub}>
                A couple more details about you, then who you'd like to meet.
              </Text>

              <Field label="Profession (optional)">
                <TextInput
                  style={styles.input}
                  value={profession}
                  onChangeText={setProfession}
                  placeholder="What do you do?"
                  placeholderTextColor={colors.inkSoft}
                  autoCapitalize="sentences"
                />
              </Field>

              <Field label="Children (optional)">
                <ChoiceChips
                  options={CHILDREN_STATUS}
                  selected={childrenStatus ? [childrenStatus] : []}
                  onChange={(v) => setChildrenStatus((v[0] as ChildrenStatus) ?? null)}
                />
              </Field>

              <Field label="Show me">
                <ChoiceChips
                  options={GENDERS}
                  selected={preferredGenders}
                  onChange={(v) => setPreferredGenders(v as Gender[])}
                  multi
                />
                <Text style={styles.hint}>Leave empty for everyone.</Text>
              </Field>

              <Field label="Age range">
                <View style={styles.ageRow}>
                  <TextInput
                    style={[styles.input, styles.ageInput]}
                    value={ageMin}
                    onChangeText={(t) => setAgeMin(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.ageDash}>to</Text>
                  <TextInput
                    style={[styles.input, styles.ageInput]}
                    value={ageMax}
                    onChangeText={(t) => setAgeMax(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
                {!prefsValid && (
                  <Text style={styles.error}>
                    Enter an age range between {AGE_FLOOR} and {AGE_CEILING}.
                  </Text>
                )}
              </Field>

              <Button
                label="Next: your prompts"
                onPress={() => setStep('prompts')}
                disabled={!prefsValid}
                style={{ marginTop: spacing.md }}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep('details')}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {step === 'prompts' && (
            <View>
              <Text style={styles.h1}>Say something</Text>
              <Text style={styles.sub}>
                Answer up to 3 prompts so people get a feel for you. Optional, but
                they're great conversation starters.
              </Text>

              <PromptPicker value={prompts} onChange={setPrompts} />

              <Button
                label="Next: your photos"
                onPress={() => setStep('photos')}
                style={{ marginTop: spacing.lg }}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep('preferences')}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {step === 'photos' && (
            <View>
              <Text style={styles.h1}>Your morning photos</Text>
              <Text style={styles.sub}>
                The camera only works between {windowLabel()}. You can finish your
                profile now and add photos later — but you'll only show up in
                other people's decks once you have a morning photo.
              </Text>

              <View style={styles.grid}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.thumb} />
                    <Text style={styles.thumbStamp}>{formatClock(new Date(p.takenAt))}</Text>
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => {
                        const target = photos[i];
                        setPhotos((prev) => prev.filter((_, idx) => idx !== i));
                        void removePhoto(target.uri);
                      }}
                      hitSlop={8}
                    >
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                {photos.length < 6 && (
                  <Pressable style={styles.addTile} onPress={() => setCameraOpen(true)}>
                    <Text style={styles.addPlus}>＋</Text>
                    <Text style={styles.addText}>Take photo</Text>
                  </Pressable>
                )}
              </View>

              <Button
                label={photos.length === 0 ? 'Skip — add photos later' : 'Next: your interests'}
                onPress={() => setStep('interests')}
                style={{ marginTop: spacing.lg }}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep('prompts')}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}

          {step === 'interests' && (
            <View>
              <Text style={styles.h1}>What you're into</Text>
              <Text style={styles.sub}>
                Pick what you love — up to 7 per category. This is how we find
                your best matches. Optional, but the more you add, the better.
              </Text>

              <InterestPicker
                selected={interests}
                onChange={setInterests}
                scroll={false}
              />

              <Button
                label={submitting ? 'Creating…' : 'Create my profile'}
                onPress={finish}
                loading={submitting}
                style={{ marginTop: spacing.lg }}
              />
              <Button
                label="Back"
                variant="ghost"
                onPress={() => setStep('photos')}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Rule({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <View style={styles.rule}>
      <Text style={styles.ruleEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleText}>{text}</Text>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
    flexGrow: 1,
  },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xl,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  rules: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ruleEmoji: {
    fontSize: 26,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  ruleText: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 2,
    lineHeight: 19,
  },

  h1: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.ink,
  },
  sub: {
    fontSize: 15,
    color: colors.inkSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 21,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  textarea: {
    height: 110,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.inkSoft,
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    color: colors.secondary,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  hint: {
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: spacing.xs,
    fontWeight: '600',
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

import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioControls } from '@/components/player/AudioControls';
import { BreathingCircle } from '@/components/ui/BreathingCircle';
import { Button } from '@/components/ui/Button';
import { OrganicBackdrop } from '@/components/ui/OrganicBackdrop';
import { Text } from '@/components/ui/Text';
import { APP_NAME } from '@/constants/brand';
import { formatMeditationMinutesLabel } from '@/constants/meditation';
import { useAppState } from '@/context/AppStateContext';
import {
  getMeditationPlayback,
  startListening,
  updateListening,
} from '@/services/meditations';
import { colors, spacing } from '@/theme/tokens';
import type { Meditation } from '@/types';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { toggleDownload } = useAppState();
  const player = useAudioPlayer(undefined, { updateInterval: 250 });
  const playback = useAudioPlayerStatus(player);
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<string | null>(null);
  const positionRef = useRef(0);
  positionRef.current = playback.currentTime;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setLoading(true);
    setError(null);
    void getMeditationPlayback(id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setError('Meditation unavailable');
          setMeditation(null);
          return;
        }
        setMeditation(result.meditation);
        if (!result.signedUrl) {
          setError('This narration is not ready yet.');
          return;
        }
        player.replace({ uri: result.signedUrl });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not open this meditation.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      try {
        player.clearLockScreenControls();
      } catch {
        // The player may already have been released.
      }
    };
  }, [id, player]);

  useEffect(() => {
    if (!playback.isLoaded || !meditation) return;
    try {
      player.setActiveForLockScreen(
        true,
        { title: meditation.title, artist: APP_NAME },
        { showSeekForward: true, showSeekBackward: true },
      );
    } catch {
      // Lock-screen controls depend on a build that includes the audio background mode.
    }
  }, [meditation, playback.isLoaded, player]);

  useEffect(() => {
    if (!playback.playing || !meditation || sessionRef.current) return;
    void startListening(meditation.id)
      .then((sessionId) => {
        sessionRef.current = sessionId;
      })
      .catch(() => undefined);
  }, [meditation, playback.playing]);

  useEffect(() => {
    if (playback.playing || !sessionRef.current) return;
    const duration = playback.duration || meditation?.actualDurationSeconds || 0;
    const position = positionRef.current;
    const completed = playback.didJustFinish || (duration > 0 && position >= duration - 1);
    void updateListening(sessionRef.current, position, completed).catch(() => undefined);
  }, [meditation?.actualDurationSeconds, playback.didJustFinish, playback.duration, playback.playing]);

  useEffect(() => {
    return () => {
      if (!sessionRef.current) return;
      void updateListening(sessionRef.current, positionRef.current, false).catch(() => undefined);
    };
  }, []);

  const duration = playback.duration > 0
    ? playback.duration
    : meditation?.actualDurationSeconds || 0;
  const canPlay = Boolean(meditation) && !error && playback.isLoaded;

  if (!meditation || error) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <Text variant="title" color={colors.ivory}>
            {loading ? 'Opening your meditation…' : error || 'Meditation unavailable'}
          </Text>
          {meditation && meditation.status !== 'ready' ? (
            <Button
              label="Continue"
              onPress={() => router.replace(`/generation/${meditation.checkinId}`)}
              style={{ marginTop: 24 }}
            />
          ) : null}
          <Button label="Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#263D35', '#3A564B', '#A8B9A3']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <OrganicBackdrop tone="dark" />

      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Close player"
            onPress={() => router.back()}
            style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.ivory} />
          </Pressable>
          <Text variant="caption" color={colors.sand}>
            Now listening
          </Text>
          <Pressable
            accessibilityLabel={meditation.downloaded ? 'Remove download' : 'Download'}
            onPress={() => {
              toggleDownload(meditation.id);
              setMeditation((current) =>
                current ? { ...current, downloaded: !current.downloaded } : current,
              );
            }}
            style={styles.iconBtn}>
            <Ionicons
              name={meditation.downloaded ? 'cloud-done' : 'download-outline'}
              size={22}
              color={colors.ivory}
            />
          </Pressable>
        </View>

        <View style={styles.center}>
          <BreathingCircle label={playback.playing ? 'Listen' : 'Rest'} size={210} />
          <Text variant="title" color={colors.ivory} align="center" style={styles.title}>
            {meditation.title}
          </Text>
          <Text variant="body" color={colors.sand} align="center">
            {meditation.intention} · {formatMeditationMinutesLabel()}
          </Text>
        </View>

        <View style={styles.controls}>
          <AudioControls
            tone="dark"
            isPlaying={playback.playing}
            positionSeconds={playback.currentTime}
            durationSeconds={duration}
            onTogglePlay={() => {
              if (!canPlay) return;
              if (playback.playing) {
                player.pause();
                return;
              }
              if (playback.didJustFinish || playback.currentTime >= Math.max(duration - 0.25, 0)) {
                void player.seekTo(0);
              }
              player.play();
            }}
            onSeek={(seconds) => {
              void player.seekTo(Math.max(0, Math.min(seconds, duration || seconds)));
            }}
            onSkip={(delta) => {
              const next = Math.max(0, Math.min(playback.currentTime + delta, duration || playback.currentTime + delta));
              void player.seekTo(next);
            }}
          />
          <Text variant="caption" color={colors.sand} align="center" style={styles.note}>
            {playback.error
              ? 'Playback was interrupted. Press play to continue.'
              : loading || !playback.isLoaded
                ? 'Opening your meditation…'
                : 'Playback continues with the screen locked.'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.forest,
  },
  safe: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    marginTop: spacing.lg,
    maxWidth: 300,
  },
  controls: {
    paddingBottom: spacing.xl,
  },
  note: {
    marginTop: spacing.lg,
    opacity: 0.8,
  },
});

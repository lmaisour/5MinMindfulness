import {
  DMSans_400Regular,
  DMSans_500Medium,
  useFonts as useDMSans,
} from '@expo-google-fonts/dm-sans';
import {
  Literata_500Medium,
  Literata_600SemiBold,
  useFonts as useLiterata,
} from '@expo-google-fonts/literata';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppStateProvider } from '@/context/AppStateContext';
import { AuthProvider } from '@/providers/AuthProvider';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
  });
  const [literataLoaded] = useLiterata({
    Literata_500Medium,
    Literata_600SemiBold,
  });

  const fontsReady = dmLoaded && literataLoaded;

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppStateProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.ivory },
              animation: 'fade',
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sign-in/index" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="check-in"
              options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
            <Stack.Screen name="generation/[id]" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="player/[id]"
              options={{ animation: 'fade', gestureEnabled: true }}
            />
          </Stack>
        </AppStateProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

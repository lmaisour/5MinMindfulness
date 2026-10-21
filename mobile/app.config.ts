import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: '5MinMindfulness',
  slug: '5minmindfulness',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'fiveminmindfulness',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.fiveminmindfulness.app',
    usesAppleSignIn: true,
    icon: './assets/expo.icon',
  },
  android: {
    package: 'com.fiveminmindfulness.app',
    adaptiveIcon: {
      backgroundColor: '#F8F6F1',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'fiveminmindfulness' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F8F6F1',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-audio',
    'expo-secure-store',
    'expo-font',
    'expo-sqlite',
    'expo-apple-authentication',
    'expo-web-browser',
    // Keep this before expo-notifications. Expo runs the last entitlements
    // mod first, so this plugin deletes aps-environment after notifications adds it.
    './plugins/withoutRemotePushEntitlement',
    [
      'expo-notifications',
      {
        // Skips UIBackgroundModes remote-notification. SDK 57 still adds aps-environment.
        enableBackgroundRemoteNotifications: false,
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: 'bb535cdf-7d53-4640-8310-cbff5647fc24',
    },
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
};

export default config;

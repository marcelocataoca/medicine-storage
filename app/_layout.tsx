import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useExpiryNotifications } from '@/hooks/use-expiry-notifications';
import { auth } from '@/lib/firebase';

export const unstable_settings = {
  anchor: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady || !navigationState?.key) return;

    const top = segments[0];
    const inLogin = top === 'login';
    const inTabs = top === '(tabs)';

    if (!user && inTabs) {
      router.replace('/login');
    } else if (user && inLogin) {
      router.replace('/(tabs)');
    }
  }, [authReady, user, segments, navigationState?.key, router]);

  useExpiryNotifications(authReady && !!user);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="medicine/details"
          options={{ title: 'Detalhes do medicamento', headerBackTitle: 'Voltar' }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

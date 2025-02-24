import { useAuth } from '@/hooks/useAuth';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  // const { user, session } = useAuth();
  // const isLandlord = user?.user_metadata?.is_landlord;

  // console.log('user', user);

  useEffect(() => {
    // This is needed for the framework to know when the app is ready
    window.frameworkReady?.();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

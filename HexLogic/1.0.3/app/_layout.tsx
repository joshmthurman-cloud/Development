import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function HeaderLogo() {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)')}
      style={headerStyles.logoTouch}
      hitSlop={12}
    >
      <Image
        source={require('@/assets/images/Logo-Header.png')}
        style={headerStyles.logo}
        contentFit="contain"
      />
    </Pressable>
  );
}

const headerStyles = StyleSheet.create({
  logoTouch: { padding: 4 },
  logo: { width: 72, height: 32 },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#24B6E4' },
            headerTintColor: '#fff',
            headerRight: () => <HeaderLogo />,
          }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-game" options={{ title: 'New Game', headerBackTitle: 'Home' }} />
          <Stack.Screen name="map-builder" options={{ title: 'Map Builder', headerBackTitle: 'Home' }} />
          <Stack.Screen name="dashboard" options={{ title: 'Active Game', headerBackTitle: 'Home' }} />
          <Stack.Screen name="player/[playerId]" options={{ title: 'Player', headerBackTitle: 'Game' }} />
          <Stack.Screen name="building/[playerId]" options={{ title: 'Add Building', headerBackTitle: 'Back' }} />
          <Stack.Screen name="building/[playerId]/[buildingId]" options={{ title: 'Edit Building', headerBackTitle: 'Back' }} />
          <Stack.Screen name="roll-result" options={{ title: 'Roll Result', headerBackTitle: 'Game' }} />
          <Stack.Screen name="move-robber" options={{ title: 'Move Robber', headerBackTitle: 'Game' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

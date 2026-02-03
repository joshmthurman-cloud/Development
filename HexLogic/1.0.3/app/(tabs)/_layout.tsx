import { Stack } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="explore" options={{ href: null }} />
    </Stack>
  );
}

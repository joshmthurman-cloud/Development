import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function SocialLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

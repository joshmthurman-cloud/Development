import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useSearchUsers, useSendFriendRequest } from '@/hooks/useSocial';
import { useAuthStore } from '@/stores/authStore';
import { TierPill } from '@/components/common/TierPill';
import type { Profile } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const myId = useAuthStore((s) => s.session?.user.id);
  const [query, setQuery] = useState('');
  const { data: results, isLoading } = useSearchUsers(query);
  const sendRequest = useSendFriendRequest();

  const filtered = results?.filter((u) => u.id !== myId) ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Find Friends' }} />
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={styles.searchWrap}>
          <TextInput
            placeholder="Search by username..."
            value={query}
            onChangeText={setQuery}
            mode="outlined"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            placeholderTextColor={colors.textMuted}
            left={<TextInput.Icon icon="magnify" color={colors.textMuted} />}
            style={styles.searchInput}
            theme={{
              colors: {
                onSurfaceVariant: colors.textSecondary,
                surfaceVariant: colors.surfaceVariant,
              },
            }}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Profile }) => (
            <Pressable
              style={styles.userRow}
              onPress={() => router.push(`/social/${item.username}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.username[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.username}</Text>
                <TierPill tier={item.tier} />
              </View>
              <Button
                mode="contained"
                compact
                onPress={() => sendRequest.mutate(item.id)}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                labelStyle={styles.addLabel}
              >
                Add
              </Button>
            </Pressable>
          )}
          ListEmptyComponent={
            query.length >= 2 && !isLoading ? (
              <Text style={styles.empty}>No users found.</Text>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchWrap: { padding: spacing.xl },
  searchInput: { backgroundColor: colors.surface },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 18 },
  userInfo: { flex: 1, gap: 4 },
  userName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  addLabel: { fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxxl },
  list: { paddingBottom: spacing.xxxl },
});

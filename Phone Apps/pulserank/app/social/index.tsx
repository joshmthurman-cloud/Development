import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import {
  useConnections,
  usePendingRequests,
  useAcceptRequest,
  useRemoveConnection,
} from '@/hooks/useSocial';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import type { SocialConnection } from '@/types';
import { colors, spacing, radius } from '@/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: connections, isLoading } = useConnections();
  const { data: requests } = usePendingRequests();
  const acceptMutation = useAcceptRequest();
  const removeMutation = useRemoveConnection();

  function getFriend(conn: SocialConnection) {
    if (conn.requester_id === profile?.id) return conn.addressee;
    return conn.requester;
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen options={{ title: 'Friends' }} />
      <SafeAreaView style={styles.safe} edges={[]}>
        {requests && requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Requests ({requests.length})
            </Text>
            {requests.map((req) => (
              <View key={req.id} style={styles.requestRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(req.requester?.username ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.name}>
                  {req.requester?.username ?? 'Unknown'}
                </Text>
                <IconButton
                  icon="check"
                  iconColor={colors.correct}
                  size={20}
                  onPress={() => acceptMutation.mutate(req.id)}
                />
                <IconButton
                  icon="close"
                  iconColor={colors.incorrect}
                  size={20}
                  onPress={() => removeMutation.mutate(req.id)}
                />
              </View>
            ))}
          </View>
        )}

        {!connections || connections.length === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title="No Friends Yet"
            message="Search for users to connect with and see their profiles."
            actionLabel="Find Friends"
            onAction={() => router.push('/social/search')}
          />
        ) : (
          <FlatList
            data={connections}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, styles.listHeader]}>
                Friends ({connections.length})
              </Text>
            }
            renderItem={({ item }: { item: SocialConnection }) => {
              const friend = getFriend(item);
              return (
                <View style={styles.friendRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(friend?.username ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={styles.name}
                    onPress={() => {
                      if (friend?.username)
                        router.push(`/social/${friend.username}`);
                    }}
                  >
                    {friend?.username ?? 'Unknown'}
                  </Text>
                  <IconButton
                    icon="account-remove"
                    iconColor={colors.textMuted}
                    size={20}
                    onPress={() => removeMutation.mutate(item.id)}
                  />
                </View>
              );
            }}
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  section: {
    padding: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
  list: { paddingBottom: spacing.xxxl },
});

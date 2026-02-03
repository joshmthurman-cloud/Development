import { Image } from 'expo-image';
import { StyleSheet, View, Pressable, Modal, ScrollView, Dimensions, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { hasSavedGame, clearGame } from '@/utils/storage';

type ActionCardProps = {
  variant: 'primary' | 'secondary';
  icon: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress?: () => void;
};

function ActionCard({ variant, icon, title, subtitle, disabled, onPress }: ActionCardProps) {
  const isPrimary = variant === 'primary';
  const cardStyle: ViewStyle[] = [
    styles.card,
    isPrimary ? styles.cardPrimary : styles.cardSecondary,
    disabled && styles.cardDisabled,
  ];
  const iconStyle = [styles.cardIcon, isPrimary ? styles.cardIconPrimary : styles.cardIconSecondary];
  const iconTextStyle = isPrimary ? styles.cardIconText : styles.cardIconTextSecondary;
  const titleStyle = [styles.cardTitle, isPrimary && styles.cardPrimaryText];
  const subtitleStyle = [styles.cardSubtitle, isPrimary && styles.cardPrimaryText, !isPrimary && styles.cardSubtitleSecondary];

  return (
    <Pressable
      style={({ pressed }) => [...cardStyle, pressed && !disabled && styles.cardPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={iconStyle}>
        <ThemedText style={iconTextStyle}>{icon}</ThemedText>
      </View>
      <View style={styles.cardTextContainer}>
        <ThemedText type="defaultSemiBold" style={titleStyle} numberOfLines={1}>{title}</ThemedText>
        <ThemedText style={subtitleStyle} numberOfLines={1}>{subtitle}</ThemedText>
      </View>
    </Pressable>
  );
}

const { width: screenWidth } = Dimensions.get('screen');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [savedGameExists, setSavedGameExists] = useState(false);
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);

  const refreshSavedGame = useCallback(async () => {
    const exists = await hasSavedGame();
    setSavedGameExists(exists);
  }, []);

  useEffect(() => {
    refreshSavedGame();
  }, [refreshSavedGame]);

  const handleNewGame = () => {
    if (savedGameExists) {
      setShowConfirmNewGame(true);
    } else {
      router.push('/new-game');
    }
  };

  const handleConfirmNewGame = async () => {
    await clearGame();
    setShowConfirmNewGame(false);
    setSavedGameExists(false);
    router.push('/new-game');
  };

  const handleContinueGame = () => {
    if (savedGameExists) router.push('/dashboard');
  };

  const logoWidth = screenWidth;
  const logoHeight = Math.min(screenWidth * 0.75, 520) * 1.406;

  return (
    <ThemedView style={[styles.container, { width: screenWidth }]}>
      <ScrollView
        style={[styles.scroll, { width: screenWidth }]}
        contentContainerStyle={[styles.scrollContent, { width: screenWidth }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero logo – full bleed to physical top and sides */}
        <View
          style={[
            styles.branding,
            {
              width: logoWidth,
              marginLeft: -insets.left,
              marginTop: -insets.top,
            },
          ]}
        >
          <Image
            source={require('@/assets/images/Logo3.png')}
            style={[styles.logo, { width: logoWidth, height: logoHeight }]}
            contentFit="contain"
          />
        </View>

        {/* Padded content: cards + footer */}
        <View style={[styles.paddedContent, { paddingTop: 16 }]}>
        {/* Three action cards – same component for all */}
        <View style={styles.cards}>
          <ActionCard
            variant="primary"
            icon="+"
            title="New Game"
            subtitle="Start a fresh game"
            onPress={handleNewGame}
          />
          <ActionCard
            variant="secondary"
            icon="▶"
            title="Continue Game"
            subtitle="Resume your session"
            disabled={!savedGameExists}
            onPress={handleContinueGame}
          />
          <ActionCard
            variant="secondary"
            icon="⎔"
            title="Map Builder"
            subtitle="Create custom boards"
            onPress={() => router.push('/map-builder')}
          />
        </View>

        {/* Footer – at bottom of scroll content */}
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            HexLogic is an unofficial companion app.
          </ThemedText>
          <ThemedText style={styles.footerText}>
            Not affiliated with Catan GmbH or related rights holders.
          </ThemedText>
          <ThemedText style={styles.footerVersion}>v1.0.2</ThemedText>
        </View>
        </View>
      </ScrollView>

      {/* New Game confirmation modal */}
      <Modal
        visible={showConfirmNewGame}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmNewGame(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowConfirmNewGame(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Start New Game?</ThemedText>
            <ThemedText style={styles.modalBody}>
              This will clear your current saved game. Are you sure?
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setShowConfirmNewGame(false)}>
                <ThemedText style={styles.modalBtnTextSecondary}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnDanger]} onPress={handleConfirmNewGame}>
                <ThemedText style={styles.modalBtnTextPrimary}>Clear & Start New</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minWidth: screenWidth,
    overflow: 'visible',
  },
  branding: {
    width: '100%',
    marginBottom: 12,
  },
  paddedContent: {
    paddingHorizontal: 24,
  },
  logo: {
    // width/height set inline for full-bleed + large size
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  cardPrimary: {
    backgroundColor: '#1D4ED8',
  },
  cardPrimaryText: {
    color: '#fff',
  },
  cardIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cardSecondary: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: {
    fontSize: 24,
    color: '#fff',
  },
  cardIconSecondary: {
    backgroundColor: 'rgba(29, 78, 216, 0.12)',
  },
  cardIconTextSecondary: {
    fontSize: 24,
    color: '#1D4ED8',
  },
  cardTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  cardSubtitleSecondary: {
    color: '#6B7280',
  },
  footer: {
    marginTop: 'auto',
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  footerVersion: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 8,
  },
  // New Game confirmation modal – match web
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: '#E5E7EB',
  },
  modalBtnDanger: {
    backgroundColor: '#DC2626',
  },
  modalBtnTextSecondary: {
    fontSize: 16,
    color: '#374151',
  },
  modalBtnTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

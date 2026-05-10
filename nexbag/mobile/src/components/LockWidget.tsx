import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDeviceStore } from '../store/device.store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardStackParamList } from '../types/navigation.types';
import { ROUTES } from '../constants/routes';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing, borderRadius } from '../constants/spacing';
import { lockApi } from '../api/lock.api';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

// Note: Ensure types align with your exact Navigation structure, some loose types here for brevity.
type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, typeof ROUTES.DASHBOARD>;

export const LockWidget = () => {
  const { device } = useDeviceStore();
  const navigation = useNavigation<NavigationProp>();
  const [isPending, setIsPending] = useState(false);

  // Consider UNLOCKED, LOCKED, PENDING states. For UI UX Spec: 
  // LOCKED (indigo background, padlock closed) or UNLOCKED (amber background, padlock open)
  const isLocked = device?.lockState === 'LOCKED';
  const isOnline = device?.isOnline || false;

  const toggleLock = async () => {
    if (!isOnline) {
      Toast.show({ type: 'error', text1: 'Bag is offline', text2: 'Cannot change lock state.' });
      return;
    }
    
    setIsPending(true);
    try {
      await lockApi.sendCommand(isLocked ? 'UNLOCK' : 'LOCK');
      // Wait for WS to update state or optimistic update
    } catch (e: any) {
      const message =
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        e?.message ??
        'Unable to send lock command';
      Toast.show({ type: 'error', text1: 'Lock Command Failed', text2: String(message) });
    } finally {
       setIsPending(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isLocked ? styles.lockedBg : styles.unlockedBg,
        !isOnline && styles.offlineBg
      ]}
      onPress={() => navigation.navigate(ROUTES.LOCK_SCREEN)}
    >
      <View style={styles.content}>
        <Icon 
          name={isLocked ? 'lock' : 'lock-open'} 
          size={32} 
          color={colors.surface} 
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {!isOnline ? 'BAG OFFLINE' : isLocked ? 'LOCKED' : 'UNLOCKED'}
          </Text>
          <Text style={styles.subtitle}>
            Tap to view lock controls
          </Text>
        </View>
      </View>

      <TouchableOpacity 
         style={[styles.quickButton, !isOnline && styles.disabledButton]} 
         onPress={toggleLock}
         disabled={!isOnline || isPending}
      >
        <Text style={[styles.quickButtonText, isLocked ? styles.lockedText : styles.unlockedText]}>
          {isPending ? 'WAIT...' : isLocked ? 'UNLOCK' : 'LOCK'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lockedBg: {
    backgroundColor: colors.locked,
  },
  unlockedBg: {
    backgroundColor: colors.unlocked, // Amber
  },
  offlineBg: {
    backgroundColor: colors.textMuted,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.surface,
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.surface,
    opacity: 0.8,
    fontSize: typography.fontSize.caption,
  },
  quickButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quickButtonText: {
    fontWeight: 'bold',
    fontSize: typography.fontSize.bodySmall,
  },
  lockedText: {
    color: colors.locked,
  },
  unlockedText: {
    color: colors.unlocked,
  },
});

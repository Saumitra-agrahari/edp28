import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, FlatList, Alert, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDeviceStore } from '../../store/device.store';
import { lockApi } from '../../api/lock.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { formatDistanceToNow } from 'date-fns';
import Toast from 'react-native-toast-message';

export const LockScreen = () => {
  const navigation = useNavigation();
  const { device } = useDeviceStore();
  const [isPending, setIsPending] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);
  
  const isLocked = device?.lockState === 'LOCKED';
  const isOnline = device?.isOnline || false;

  const { data: historyData, refetch: refetchHistory } = useQuery({
     queryKey: ['lock-history'],
     queryFn: () => lockApi.getHistory(5),
  });

  const history = historyData?.data?.history || [];

  const toggleMutation = useMutation({
     mutationFn: (action: 'LOCK' | 'UNLOCK') => lockApi.sendCommand(action),
     onSuccess: () => {
        // Start 10s timeout logic, but UI can optimistically wait for WS update
        // We handle this via state locally in the component for the button text
     },
     onError: () => {
        setIsPending(false);
        Toast.show({ type: 'error', text1: 'Failed to send command' });
     }
  });

  useEffect(() => {
     // If the device lockState changes, clear the pending state
     setIsPending(false);
     refetchHistory(); // Refresh history
  }, [device?.lockState]);

  const handleToggle = () => {
     const intentAction = isLocked ? 'UNLOCK' : 'LOCK';

     if (intentAction === 'UNLOCK') {
        Alert.alert(
           "Unlock your bag?",
           "This will physically unlock your Smart Bag-Pack.",
           [
              { text: "Cancel", style: "cancel" },
              { text: "Unlock", style: "destructive", onPress: () => executeToggle(intentAction) }
           ]
        );
     } else {
        executeToggle(intentAction);
     }
  };

  const executeToggle = (action: 'LOCK' | 'UNLOCK') => {
     setIsPending(true);
     toggleMutation.mutate(action);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.textNeutral} />
         </TouchableOpacity>
         <Text style={styles.title}>Lock Control</Text>
         <View style={{width: 24}}/>
      </View>

      <View style={styles.statusSection}>
         <View style={styles.animationWrapper}>
            {/* Pulsing ring */}
            <Animated.View
               style={[
                 styles.pulseRing,
                 isLocked ? styles.pulseRingLocked : styles.pulseRingUnlocked,
                 !isOnline && styles.pulseRingOffline,
                 { transform: [{ scale: pulseAnim }] },
               ]}
            />
            <View style={[styles.animationContainer, isLocked ? styles.lockedBg : styles.unlockedBg, !isOnline && styles.offlineBg]}>
               <Icon
                  name={isLocked ? 'lock' : 'lock-open'}
                  size={80}
                  color={colors.surface}
               />
            </View>
         </View>

         <Text style={[styles.statusText, isLocked ? styles.textLocked : styles.textUnlocked, !isOnline && styles.textOffline]}>
            {isPending ? 'PENDING...' : !isOnline ? 'BAG OFFLINE' : isLocked ? 'BAG IS LOCKED' : 'BAG IS UNLOCKED'}
         </Text>

         {!isOnline ? (
            <Text style={styles.offlineNotice}>Bag must be online to control lock</Text>
         ) : null}

         <TouchableOpacity 
            style={[
               styles.primaryButton, 
               isLocked ? styles.btnUnlock : styles.btnLock,
               (isPending || !isOnline) && styles.btnDisabled
            ]}
            onPress={handleToggle}
            disabled={isPending || !isOnline}
         >
            <Text style={styles.primaryButtonText}>
               {isPending ? 'WAITING FOR BAG...' : isLocked ? 'Unlock Bag' : 'Lock Bag'}
            </Text>
         </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
         <Text style={styles.historyTitle}>Lock History</Text>
         <FlatList
            data={history}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }) => (
               <View style={styles.historyItem}>
                  <Icon 
                     name={item.eventType === 'LOCK_STATUS_LOCKED' ? 'lock' : 'lock-open'} 
                     size={24} 
                     color={item.eventType === 'LOCK_STATUS_LOCKED' ? colors.locked : colors.unlocked} 
                     style={styles.historyIcon}
                  />
                  <View style={styles.historyDetails}>
                     <Text style={styles.historyAction}>
                        Bag {item.eventType === 'LOCK_STATUS_LOCKED' ? 'Locked' : 'Unlocked'}
                     </Text>
                     <Text style={styles.historyTime}>
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                     </Text>
                  </View>
                  <Text style={styles.historyInitiator}>
                     via {item.initiatedBy.toUpperCase()}
                  </Text>
               </View>
            )}
            ListEmptyComponent={() => (
               <Text style={styles.emptyHistory}>No recent lock history.</Text>
            )}
         />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  backButton: {},
  title: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  statusSection: {
     alignItems: 'center',
     paddingVertical: spacing.xxl,
     paddingHorizontal: spacing.xl,
  },
  animationWrapper: {
     width: 240,
     height: 240,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: spacing.xl,
  },
  pulseRing: {
     position: 'absolute',
     width: 220,
     height: 220,
     borderRadius: 110,
     opacity: 0.25,
  },
  pulseRingLocked: {
     backgroundColor: colors.locked,
  },
  pulseRingUnlocked: {
     backgroundColor: colors.unlocked,
  },
  pulseRingOffline: {
     backgroundColor: colors.textMuted,
  },
  animationContainer: {
     width: 180,
     height: 180,
     borderRadius: 90,
     justifyContent: 'center',
     alignItems: 'center',
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 10 },
     shadowOpacity: 0.2,
     shadowRadius: 20,
     elevation: 10,
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

  statusText: {
     fontSize: typography.fontSize.title,
     fontWeight: 'bold',
     marginBottom: spacing.sm,
  },
  textLocked: { color: colors.locked },
  textUnlocked: { color: colors.unlocked },
  textOffline: { color: colors.textMuted },
  offlineNotice: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textMuted,
     marginBottom: spacing.lg,
  },
  primaryButton: {
     width: '100%',
     height: 56,
     borderRadius: borderRadius.full,
     justifyContent: 'center',
     alignItems: 'center',
     marginTop: spacing.xl,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.2,
     shadowRadius: 8,
     elevation: 4,
  },
  btnUnlock: {
     backgroundColor: colors.danger,
  },
  btnLock: {
     backgroundColor: colors.locked,
  },
  btnDisabled: {
     backgroundColor: colors.border,
     shadowOpacity: 0,
     elevation: 0,
  },
  primaryButtonText: {
     color: colors.surface,
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
     textTransform: 'uppercase',
  },
  historySection: {
     flex: 1,
     backgroundColor: colors.surface,
     borderTopLeftRadius: borderRadius.lg,
     borderTopRightRadius: borderRadius.lg,
     padding: spacing.xl,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: -2 },
     shadowOpacity: 0.05,
     shadowRadius: 10,
     elevation: 10,
  },
  historyTitle: {
     fontSize: typography.fontSize.heading,
     fontWeight: 'bold',
     color: colors.textNeutral,
     marginBottom: spacing.lg,
  },
  historyItem: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: spacing.lg,
  },
  historyIcon: {
     marginRight: spacing.md,
  },
  historyDetails: {
     flex: 1,
  },
  historyAction: {
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
     color: colors.textNeutral,
  },
  historyTime: {
     fontSize: typography.fontSize.caption,
     color: colors.textMuted,
  },
  historyInitiator: {
     fontSize: typography.fontSize.caption,
     color: colors.textMuted,
     backgroundColor: colors.background,
     paddingHorizontal: spacing.sm,
     paddingVertical: 4,
     borderRadius: borderRadius.sm,
  },
  emptyHistory: {
     fontSize: typography.fontSize.body,
     color: colors.textMuted,
     textAlign: 'center',
     marginTop: spacing.xxl,
  },
});

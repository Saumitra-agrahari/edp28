import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { RootStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import { deviceApi } from '../../api/device.api';
import { useAuthStore } from '../../store/auth.store';
import { useDeviceStore } from '../../store/device.store';
import Toast from 'react-native-toast-message';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, typeof ROUTES.PAIR_DEVICE>;

export const PairDeviceScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const setDeviceId = useAuthStore((state) => state.setDeviceId);
  const setDevice = useDeviceStore((state) => state.setDevice);
  const [deviceCode, setDeviceCode] = useState('');

  const pairMutation = useMutation({
    mutationFn: () => deviceApi.pairDevice(deviceCode),
    onSuccess: (data) => {
       const payload = data?.data?.device ?? data?.data ?? data;

       // update auth user device id
       setDeviceId(payload.id);
       setDevice({
        id: String(payload.id ?? ''),
        deviceCode: String(payload.device_code ?? payload.deviceCode ?? ''),
        deviceName: String(payload.device_name ?? payload.deviceName ?? 'Smart Bag-Pack'),
        isOnline: Boolean(payload.is_online ?? payload.isOnline ?? false),
        firmwareVersion: payload.firmware_version ?? payload.firmwareVersion ?? null,
        geofenceState: String(payload.geofence_state ?? payload.geofenceState ?? 'UNKNOWN'),
        lockState: String(payload.lock_state ?? payload.lockState ?? 'UNKNOWN'),
        lastKnownLat: payload.last_known_lat ?? payload.lastKnownLat ?? null,
        lastKnownLng: payload.last_known_lng ?? payload.lastKnownLng ?? null,
        lastLocationAt: payload.last_location_at ?? payload.lastLocationAt ?? null,
       });
       Toast.show({
          type: 'success',
          text1: 'Device Paired',
          text2: 'Your Smart Bag-Pack is ready!',
       });
       navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] });
    },
    onError: (error: any) => {
       Toast.show({
          type: 'error',
          text1: 'Pairing Failed',
          text2: error.message || 'Invalid Device ID.',
       });
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.illustrationPlaceholder} />
            <Text style={styles.title}>Connect your Smart Bag-Pack</Text>
            <Text style={styles.subtitle}>Enter the Device ID found on the label inside your bag.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Device ID</Text>
            <View style={styles.inputContainer}>
              <Icon name="barcode-scan" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. SBP-A1B2C3D4"
                autoCapitalize="characters"
                value={deviceCode}
                onChangeText={(text) => setDeviceCode(text.toUpperCase())}
              />
              <TouchableOpacity style={styles.qrButton} onPress={() => { /* Open QR Scanner */ }}>
                 <Icon name="qrcode-scan" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, pairMutation.isPending && styles.buttonDisabled]} 
              onPress={() => pairMutation.mutate()}
              disabled={pairMutation.isPending || deviceCode.length === 0}
            >
              <Text style={styles.primaryButtonText}>
                {pairMutation.isPending ? 'Connecting...' : 'Connect Device'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  illustrationPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: colors.primary + '20',
    borderRadius: 75,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.title,
    fontWeight: 'bold',
    color: colors.textNeutral,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: typography.fontSize.label,
    fontWeight: '600',
    color: colors.textNeutral,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    height: 54,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.body,
    color: colors.textNeutral,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  qrButton: {
    padding: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
  },
});

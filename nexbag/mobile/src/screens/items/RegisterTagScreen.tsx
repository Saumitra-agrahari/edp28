import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rfidApi } from '../../api/rfid.api';
import { ItemsStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

type NavigationProp = NativeStackNavigationProp<ItemsStackParamList, 'RegisterTag'>;

/**
 * Manual 4-digit Tag ID + Name entry for item registration.
 * NO scanning option - user enters Tag ID manually and gives item a name.
 * Scanning is only used for verification (checking which items are present).
 */
export const RegisterTagScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const [tagId, setTagId] = useState('');
  const [itemName, setItemName] = useState('');

  useEffect(() => {
    const incomingTagId = String(route?.params?.tagId ?? '').trim();
    if (incomingTagId) {
      setTagId(incomingTagId);
    }
  }, [route?.params?.tagId]);

  const registerMutation = useMutation({
    mutationFn: () => rfidApi.registerTag({ tagId: tagId.trim().padStart(4, '0').slice(-4), alias: itemName.trim() }),
    onSuccess: async () => {
      Toast.show({ type: 'success', text1: 'Item Registered', text2: itemName });
      await queryClient.invalidateQueries({ queryKey: ['rfid-tags'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMsg });
    },
  });

  const isFormValid = tagId.trim().length > 0 && itemName.trim().length > 0;

  const handleRegister = () => {
    if (!isFormValid) return;
    registerMutation.mutate();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.textNeutral} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Enter the 4-digit Tag ID and give your item a name. Once registered, place the tag in your bag and the system will automatically detect it during scans.
          </Text>
        </View>

        {/* Tag ID Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>TAG ID</Text>
          <TextInput
            style={styles.input}
            value={tagId}
            onChangeText={setTagId}
            placeholder="e.g., 1234"
            placeholderTextColor={colors.textMuted}
            editable={!registerMutation.isPending}
            maxLength={4}
            keyboardType="number-pad"
          />
          <Text style={styles.helperText}>Enter the 4-digit code printed on your RFID tag</Text>
        </View>

        {/* Item Name Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={itemName}
            onChangeText={setItemName}
            placeholder="e.g., Wallet, Keys, Passport"
            placeholderTextColor={colors.textMuted}
            editable={!registerMutation.isPending}
            maxLength={50}
          />
          <Text style={styles.helperText}>Give this item a memorable name</Text>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.primaryButton, !isFormValid && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={!isFormValid || registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Icon name="check" size={20} color={colors.surface} style={{ marginRight: spacing.md }} />
              <Text style={styles.primaryButtonText}>Register Item</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          disabled={registerMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl, // Handle SafeArea
  },
  headerTitle: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.fontSize.body,
    lineHeight: 20,
  },
  formGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.caption,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    width: '100%',
    height: 48,
    paddingHorizontal: spacing.md,
    color: colors.textNeutral,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    minHeight: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textNeutral,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
});

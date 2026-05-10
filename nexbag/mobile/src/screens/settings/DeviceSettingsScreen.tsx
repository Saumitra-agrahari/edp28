import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { deviceApi } from '../../api/device.api';
import { useDeviceStore } from '../../store/device.store';
import { useAuthStore } from '../../store/auth.store';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const DeviceSettingsScreen = () => {
    const navigation = useNavigation();
    const { device, updateDeviceState } = useDeviceStore();
    const { setDeviceId } = useAuthStore();
    const [name, setName] = useState(device?.deviceName || '');

    const updateMutation = useMutation({
        mutationFn: () => deviceApi.updateDevice(name),
        onSuccess: (data) => {
            updateDeviceState({ deviceName: data.data.device.deviceName });
            Toast.show({ type: 'success', text1: 'Device Name Updated' });
        },
        onError: () => Toast.show({ type: 'error', text1: 'Failed to update' }),
    });

    const unpairMutation = useMutation({
        mutationFn: () => deviceApi.unpairDevice(),
        onSuccess: () => {
            setDeviceId(null); // Clear from auth store
            Toast.show({ type: 'success', text1: 'Device Unpaired' });
            // The splash/root router will automatically redirect to PairDevice based on state
        },
        onError: () => Toast.show({ type: 'error', text1: 'Failed to unpair' }),
    });

    const handleUnpair = () => {
        Alert.alert(
            "Unpair Device?",
            "You will not be able to track or lock this bag until paired again.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Unpair", style: "destructive", onPress: () => unpairMutation.mutate() }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.textNeutral} />
                </TouchableOpacity>
                <Text style={styles.title}>Device Settings</Text>
                <View style={{width: 24}}/>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoCard}>
                    <Text style={styles.label}>Device ID</Text>
                    <Text style={styles.deviceId}>{device?.deviceCode}</Text>
                    <Text style={styles.firmware}>Firmware: {device?.firmwareVersion || '1.0.0'}</Text>
                </View>

                <Text style={styles.sectionHeader}>Name your bag</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Daily Backpack"
                />

                <TouchableOpacity 
                    style={[styles.primaryButton, updateMutation.isPending && {opacity: 0.7}]}
                    onPress={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending || name === device?.deviceName}
                >
                    <Text style={styles.primaryButtonText}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Name'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.dangerZone}>
                    <Text style={styles.dangerTitle}>Danger Zone</Text>
                    <Text style={styles.dangerDesc}>Unpairing will remove this device from your account.</Text>
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleUnpair}>
                        <Text style={styles.secondaryButtonText}>Unpair Device</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: spacing.xl, backgroundColor: colors.surface,
    },
    backButton: {},
    title: { fontSize: typography.fontSize.heading, fontWeight: 'bold', color: colors.textNeutral },
    content: { padding: spacing.lg },
    infoCard: {
        backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.lg,
        marginBottom: spacing.xxl, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    label: { fontSize: typography.fontSize.label, color: colors.textMuted, marginBottom: spacing.xs },
    deviceId: { fontSize: typography.fontSize.title, fontWeight: 'bold', color: colors.textNeutral, fontFamily: 'monospace', marginBottom: spacing.sm },
    firmware: { fontSize: typography.fontSize.caption, color: colors.textMuted },
    sectionHeader: { fontSize: typography.fontSize.label, fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.xs },
    input: {
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md, height: 50, fontSize: typography.fontSize.body, color: colors.textNeutral, marginBottom: spacing.xl,
    },
    primaryButton: {
        backgroundColor: colors.primary, height: 50, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xxl,
    },
    primaryButtonText: { color: colors.surface, fontSize: typography.fontSize.body, fontWeight: 'bold' },
    dangerZone: { marginTop: spacing.xxl, padding: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.danger + '30', backgroundColor: colors.danger + '05' },
    dangerTitle: { fontSize: typography.fontSize.body, fontWeight: 'bold', color: colors.danger, marginBottom: spacing.xs },
    dangerDesc: { fontSize: typography.fontSize.caption, color: colors.textMuted, marginBottom: spacing.lg },
    secondaryButton: { height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.danger },
    secondaryButtonText: { color: colors.danger, fontSize: typography.fontSize.body, fontWeight: '600' },
});

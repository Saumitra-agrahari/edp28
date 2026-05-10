import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const ChangePasswordScreen = () => {
    const navigation = useNavigation();
    
    // In a real app this would call an endpoint to change the logged in user's password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const changePasswordMutation = useMutation({
        mutationFn: async () => {
           // mock endpoint
           const res = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
           return res.data;
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'Password Changed' });
            navigation.goBack();
        },
        onError: () => Toast.show({ type: 'error', text1: 'Error', text2: 'Make sure your current password is correct.'}),
    });

    const handleSave = () => {
       if (newPassword !== confirmPassword) {
          Toast.show({ type: 'error', text1: 'Passwords do not match' });
          return;
       }
       changePasswordMutation.mutate();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color={colors.textNeutral} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Change Password</Text>
                    <View style={{width: 24}}/>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.label}>Current Password</Text>
                    <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholder="Current password"
                    />

                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder="New password (min 8 chars)"
                    />

                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholder="Type it again"
                    />

                    <TouchableOpacity 
                        style={[styles.primaryButton, changePasswordMutation.isPending && {opacity: 0.7}]}
                        onPress={handleSave}
                        disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                    >
                        <Text style={styles.primaryButtonText}>
                            {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    label: { fontSize: typography.fontSize.label, fontWeight: '600', color: colors.textNeutral, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md, height: 50, fontSize: typography.fontSize.body, color: colors.textNeutral, marginBottom: spacing.xl,
    },
    primaryButton: {
        backgroundColor: colors.primary, height: 50, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl,
    },
    primaryButtonText: { color: colors.surface, fontSize: typography.fontSize.body, fontWeight: 'bold' },
});

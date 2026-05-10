import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../api/auth.api'; // Assuming you have a me endpoint to update profile
import { apiClient } from '../../api/client';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const ProfileScreen = () => {
    const navigation = useNavigation();
    const { user, setUser } = useAuthStore();
    
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await apiClient.patch('/users/me', { fullName });
            return res.data;
        },
        onSuccess: (data) => {
            setUser(data.user);
            Toast.show({ type: 'success', text1: 'Profile Updated' });
            navigation.goBack();
        },
        onError: () => Toast.show({ type: 'error', text1: 'Failed to update profile' }),
    });

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-left" size={24} color={colors.textNeutral} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Profile</Text>
                    <View style={{width: 24}}/>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarPlaceholder}>
                            <Icon name="camera-plus" size={32} color={colors.surface} />
                        </View>
                    </View>

                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="John Doe"
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        value={email}
                        editable={false}
                    />
                    <Text style={styles.helpText}>Email cannot be changed.</Text>

                    <TouchableOpacity 
                        style={[styles.primaryButton, updateMutation.isPending && {opacity: 0.7}]}
                        onPress={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending || fullName === user?.fullName}
                    >
                        <Text style={styles.primaryButtonText}>
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
    avatarSection: { alignItems: 'center', marginVertical: spacing.xl },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: typography.fontSize.label, fontWeight: '600', color: colors.textNeutral, marginBottom: spacing.xs },
    input: {
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md, height: 50, fontSize: typography.fontSize.body, color: colors.textNeutral, marginBottom: spacing.xl,
    },
    inputDisabled: { backgroundColor: colors.border, color: colors.textMuted, marginBottom: spacing.xs },
    helpText: { fontSize: typography.fontSize.caption, color: colors.textMuted, marginBottom: spacing.xl, marginTop: -spacing.md },
    primaryButton: {
        backgroundColor: colors.primary, height: 50, borderRadius: borderRadius.full, justifyContent: 'center', alignItems: 'center', marginTop: spacing.xl,
    },
    primaryButtonText: { color: colors.surface, fontSize: typography.fontSize.body, fontWeight: 'bold' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

export const AlertPreferencesScreen = () => {
    const navigation = useNavigation();
    const queryClient = useQueryClient();
    
    // Fallback UI state while API is not fully integrated
    const [preferences, setPreferences] = useState<Record<string, boolean>>({
        security: true,
        items: true,
        battery: false,
        system: true
    });

    const togglePreference = (key: string) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
        // Simulate API saving
    };

    const renderToggle = (key: string, title: string, description: string, icon: string) => {
        return (
            <View style={styles.toggleRow}>
                <View style={styles.toggleLeft}>
                    <Icon name={icon} size={24} color={colors.textNeutral} style={styles.toggleIcon} />
                    <View style={styles.toggleTexts}>
                        <Text style={styles.toggleTitle}>{title}</Text>
                        <Text style={styles.toggleDescription}>{description}</Text>
                    </View>
                </View>
                <Switch 
                   value={preferences[key]} 
                   onValueChange={() => togglePreference(key)} 
                   trackColor={{ false: colors.border, true: colors.primary }}
                />
            </View>
        )
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.textNeutral} />
                </TouchableOpacity>
                <Text style={styles.title}>Alert Preferences</Text>
                <View style={{width: 24}}/>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionDesc}>
                    Choose which notifications you want to receive on your phone.
                </Text>

                <View style={styles.card}>
                   {renderToggle('security', 'Security Alerts', 'Anti-theft, geofence breaches, and lock tampering.', 'shield-alert-outline')}
                   <View style={styles.divider} />
                   {renderToggle('items', 'Item Reminders', 'Alerts when registered items are missing.', 'tag-multiple-outline')}
                   <View style={styles.divider} />
                   {renderToggle('battery', 'Battery Alerts', 'Low battery warnings for the bag.', 'battery-alert-variant-outline')}
                   <View style={styles.divider} />
                   {renderToggle('system', 'System Updates', 'Firmware updates and maintenance.', 'cellphone-cog')}
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
    sectionDesc: { fontSize: typography.fontSize.body, color: colors.textMuted, marginBottom: spacing.xl },
    card: {
        backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: spacing.md },
    toggleIcon: { marginRight: spacing.md },
    toggleTexts: { flex: 1 },
    toggleTitle: { fontSize: typography.fontSize.body, fontWeight: '600', color: colors.textNeutral },
    toggleDescription: { fontSize: typography.fontSize.caption, color: colors.textMuted, marginTop: 2 },
    divider: { height: 1, backgroundColor: colors.background, marginLeft: spacing.lg + 24 },
});

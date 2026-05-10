import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

// Placeholder screen - in reality we could use DateTimePicker
export const QuietHoursScreen = () => {
    const navigation = useNavigation();
    
    const [isEnabled, setIsEnabled] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={colors.textNeutral} />
                </TouchableOpacity>
                <Text style={styles.title}>Quiet Hours</Text>
                <View style={{width: 24}}/>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionDesc}>
                    During quiet hours, you will only receive critical security alerts (like bag moving or geofence breaches).
                </Text>

                <View style={styles.card}>
                   <View style={styles.toggleRow}>
                       <Text style={styles.toggleTitle}>Enable Quiet Hours</Text>
                       <Switch 
                          value={isEnabled} 
                          onValueChange={setIsEnabled} 
                          trackColor={{ false: colors.border, true: colors.primary }}
                       />
                   </View>
                   {isEnabled && (
                      <View>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.timeRow}>
                            <Text style={styles.timeLabel}>Start time</Text>
                            <Text style={styles.timeValue}>10:00 PM</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.timeRow}>
                            <Text style={styles.timeLabel}>End time</Text>
                            <Text style={styles.timeValue}>07:00 AM</Text>
                        </TouchableOpacity>
                      </View>
                   )}
                </View>
            </View>
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
    sectionDesc: { fontSize: typography.fontSize.body, color: colors.textMuted, marginBottom: spacing.xl, lineHeight: typography.lineHeight.body },
    card: {
        backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
    toggleTitle: { fontSize: typography.fontSize.body, fontWeight: '600', color: colors.textNeutral },
    divider: { height: 1, backgroundColor: colors.background, marginVertical: spacing.sm },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
    timeLabel: { fontSize: typography.fontSize.body, color: colors.textNeutral },
    timeValue: { fontSize: typography.fontSize.body, fontWeight: '600', color: colors.primary },
});

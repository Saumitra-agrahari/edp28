import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import { useAuthStore } from '../../store/auth.store';
import { useDeviceStore } from '../../store/device.store';
import { useAuth } from '../../hooks/useAuth';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

type NavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Settings'>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const { device } = useDeviceStore();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => logout() }
      ]
    );
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderRow = (icon: string, title: string, subtitle?: string, onPress?: () => void, isDestructive?: boolean) => (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, isDestructive && styles.iconContainerDestructive]}>
          <Icon name={icon} size={24} color={isDestructive ? colors.danger : colors.primary} />
        </View>
        <View>
          <Text style={[styles.rowTitle, isDestructive && styles.textDestructive]}>{title}</Text>
          {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {!isDestructive && <Icon name="chevron-right" size={24} color={colors.border} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
           <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {renderSectionHeader('Account')}
        <View style={styles.card}>
           {renderRow('account', 'Profile', user?.fullName, () => navigation.navigate(ROUTES.PROFILE_SETTINGS))}
           <View style={styles.divider} />
           {renderRow('lock-reset', 'Change Password', undefined, () => navigation.navigate(ROUTES.CHANGE_PASSWORD))}
        </View>

        {renderSectionHeader('Device')}
        <View style={styles.card}>
           {renderRow('bag-personal', 'Device Settings', device?.deviceName || 'Smart Bag-Pack', () => navigation.navigate(ROUTES.DEVICE_SETTINGS))}
        </View>

        {renderSectionHeader('Alerts & Notifications')}
        <View style={styles.card}>
           {renderRow('bell-ring', 'Alert Preferences', 'Manage push notifications', () => navigation.navigate(ROUTES.ALERT_PREFERENCES))}
           <View style={styles.divider} />
           {renderRow('moon-waning-crescent', 'Quiet Hours', 'Pause non-critical alerts', () => navigation.navigate(ROUTES.QUIET_HOURS))}
        </View>

        {renderSectionHeader('App')}
        <View style={styles.card}>
           {renderRow('information-outline', 'About', 'Version 1.0.0')}
           <View style={styles.divider} />
           {renderRow('file-document-outline', 'Terms of Service')}
           <View style={styles.divider} />
           {renderRow('shield-half-full', 'Privacy Policy')}
        </View>

        <View style={[styles.card, styles.logoutCard]}>
           {renderRow('logout', 'Log Out', undefined, handleLogout, true)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.massive,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.fontSize.display,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  sectionHeader: {
    fontSize: typography.fontSize.label,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden', // to keep dividers inside
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutCard: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerDestructive: {
    backgroundColor: colors.danger + '10',
  },
  rowTitle: {
    fontSize: typography.fontSize.body,
    fontWeight: '600',
    color: colors.textNeutral,
  },
  rowSubtitle: {
    fontSize: typography.fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  textDestructive: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginLeft: spacing.lg + 40 + spacing.md, // align with text
  },
});

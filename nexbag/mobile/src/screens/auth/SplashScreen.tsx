import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Text } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { storageService } from '../../services/storage.service';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SplashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, isRestoring, setRestoring, user } = useAuthStore();

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // App starts restoring tokens from secure storage implicitly in client initialization 
        // Here we just orchestrate the redirection
        
        // Wait for a brief moment for visual effect (min 1 sec)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (isAuthenticated) {
          if (user && !user.deviceId) {
             navigation.reset({ index: 0, routes: [{ name: ROUTES.PAIR_DEVICE }] });
          } else {
             navigation.reset({ index: 0, routes: [{ name: ROUTES.MAIN_TABS }] });
          }
        } else {
          const onboardingShown = await storageService.getOnboardingShown();
          if (!onboardingShown) {
             // Let auth navigation handle it, typically we route to Auth Stack -> Onboarding
             // Using reset to clear history
             navigation.reset({
                index: 0,
                routes: [{ name: 'Auth', params: { screen: ROUTES.ONBOARDING } }],
              });
          } else {
             navigation.reset({
                index: 0,
                routes: [{ name: 'Auth', params: { screen: ROUTES.LOGIN } }],
              });
          }
        }
      } catch (e) {
         console.warn(e);
      } finally {
         setRestoring(false);
      }
    };

    bootstrapAsync();
  }, [isAuthenticated, user]);

  return (
    <View style={styles.container}>
      {/* Assuming an asset icon.png exists */}
      {/* <Image source={require('../../../assets/icon.png')} style={styles.logo} /> */}
      <View style={styles.logoPlaceholder} />
      <Text style={styles.title}>Smart Bag-Pack</Text>
      <Text style={styles.tagline}>Your bag, always in control.</Text>
      <ActivityIndicator size="large" color={colors.surface} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: typography.fontSize.title,
    color: colors.surface,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: typography.fontSize.bodySmall,
    color: colors.surface,
    opacity: 0.8,
  },
  loader: {
    marginTop: 40,
  },
});

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import { ROUTES } from '../../constants/routes';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import { storageService } from '../../services/storage.service';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Never lose your items',
    subtitle: 'Track your belongings with RFID tags and get alerted if you leave them behind.',
    // image: require('../../../assets/onboarding_1.png'), // placeholder
  },
  {
    id: '2',
    title: 'Know where your bag is',
    subtitle: 'Built-in GPS lets you see your bag\'s live location and set up geofences.',
  },
  {
    id: '3',
    title: 'Lock it from anywhere',
    subtitle: 'Secure your bag remotely with the app and our smart locking mechanism.',
  },
];

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, typeof ROUTES.ONBOARDING>;

export const OnboardingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    await storageService.setOnboardingShown(true);
    navigation.replace(ROUTES.LOGIN);
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={slidesRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.imagePlaceholder} />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.skipButton} 
            onPress={finishOnboarding}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    width,
    alignItems: 'center',
    padding: spacing.xl,
  },
  imagePlaceholder: {
    width: width * 0.8,
    height: height * 0.5,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.title,
    fontWeight: 'bold',
    color: colors.textNeutral,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: typography.lineHeight.body,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: spacing.md,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: typography.fontSize.body,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  nextText: {
    color: colors.surface,
    fontSize: typography.fontSize.body,
    fontWeight: 'bold',
  },
});

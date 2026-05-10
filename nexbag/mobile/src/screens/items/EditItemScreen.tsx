import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { useRfidStore } from '../../store/rfid.store';
import { rfidApi } from '../../api/rfid.api';
import { ItemsStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import { spacing, borderRadius } from '../../constants/spacing';
import { icons } from '../../constants/icons';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';

// Note: Ensure this is rendered as a modal/bottom sheet in navigation config
type NavigationProp = NativeStackNavigationProp<ItemsStackParamList, 'EditItem'>;

const ICON_OPTIONS = [
  icons.laptop, icons.phone, icons.wallet, icons.book, icons.key, icons.bottle, icons.bag, icons.passport
];

export const EditItemScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
   const tagId = String(route.params?.tagId ?? '');
  const { tags } = useRfidStore();
  
   const existingTag = tags.find(t => String(t.id) === tagId);
   const displayTagId = String(existingTag?.tagId ?? '').padStart(4, '0');

  const [alias, setAlias] = useState(existingTag?.alias || '');
  const [selectedIcon, setSelectedIcon] = useState(existingTag?.icon || icons.bag);
   const [isActive, setIsActive] = useState(existingTag?.isActive ?? true);

  useEffect(() => {
    if (!existingTag) {
      Toast.show({ type: 'error', text1: 'Tag not found' });
      navigation.goBack();
    }
   }, [existingTag, navigation]);

  const updateMutation = useMutation({
   mutationFn: () => rfidApi.updateTag(tagId, { alias, icon: selectedIcon, isActive }),
    onSuccess: () => {
       Toast.show({ type: 'success', text1: 'Item Updated' });
       navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update item' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => rfidApi.deleteTag(tagId),
    onSuccess: () => {
       Toast.show({ type: 'success', text1: 'Item Deleted' });
       navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to delete item' }),
  });

  const handleDelete = () => {
     Alert.alert(
        "Delete Item", 
        "Are you sure you want to stop tracking this item?", 
        [
           { text: "Cancel", style: "cancel" },
           { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() }
        ]
     );
  };

  if (!existingTag) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.title}>Edit Item</Text>
         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="close" size={24} color={colors.textNeutral} />
         </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
         <Text style={styles.label}>Item Icon</Text>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
            {ICON_OPTIONS.map((iconName) => (
               <TouchableOpacity 
                 key={iconName} 
                 style={[styles.iconOption, selectedIcon === iconName && styles.iconActive]}
                 onPress={() => setSelectedIcon(iconName)}
               >
                  <Icon name={iconName} size={28} color={selectedIcon === iconName ? colors.primary : colors.textMuted} />
               </TouchableOpacity>
            ))}
         </ScrollView>

         <Text style={styles.label}>Item Name</Text>
         <TextInput
            style={styles.input}
            value={alias}
            onChangeText={setAlias}
            placeholder="e.g. Work Laptop"
            maxLength={50}
         />

         <Text style={styles.label}>Registered Tag ID</Text>
         <View style={styles.staticField}>
            <Text style={styles.staticText}>{displayTagId || '0000'}</Text>
         </View>

         <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Track This Item</Text>
              <Text style={styles.toggleSubtitle}>Disable to ignore missing alerts for this tag.</Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} />
         </View>

         <View style={styles.actions}>
            <TouchableOpacity 
               style={[styles.saveBtn, updateMutation.isPending && {opacity: 0.7}]} 
               onPress={() => updateMutation.mutate()}
               disabled={updateMutation.isPending}
            >
               <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
               style={styles.deleteBtn} 
               onPress={handleDelete}
               disabled={deleteMutation.isPending}
            >
               <Text style={styles.deleteBtnText}>Delete Tag</Text>
            </TouchableOpacity>
         </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl, // Handle SafeArea implicitly if modal
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.heading,
    fontWeight: 'bold',
    color: colors.textNeutral,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.xl,
    top: spacing.xxl,
  },
  content: {
    padding: spacing.xl,
  },
  label: {
     fontSize: typography.fontSize.label,
     fontWeight: '600',
     color: colors.textNeutral,
     marginBottom: spacing.sm,
  },
  iconScroll: {
     flexDirection: 'row',
     marginBottom: spacing.xl,
  },
  iconOption: {
     width: 50,
     height: 50,
     borderRadius: 25,
     backgroundColor: colors.surface,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: spacing.md,
     borderWidth: 2,
     borderColor: 'transparent',
  },
  iconActive: {
     borderColor: colors.primary,
     backgroundColor: colors.primary + '10',
  },
  input: {
     backgroundColor: colors.surface,
     borderWidth: 1,
     borderColor: colors.border,
     borderRadius: borderRadius.md,
     paddingHorizontal: spacing.md,
     height: 50,
     fontSize: typography.fontSize.body,
     color: colors.textNeutral,
     marginBottom: spacing.xl,
  },
  staticField: {
     backgroundColor: colors.border,
     paddingHorizontal: spacing.md,
     height: 50,
     justifyContent: 'center',
     borderRadius: borderRadius.md,
     marginBottom: spacing.xxl,
  },
  staticText: {
     fontSize: typography.fontSize.bodySmall,
     color: colors.textMuted,
     fontFamily: 'monospace',
  },
  toggleRow: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     marginBottom: spacing.xl,
  },
  toggleTitle: {
     color: colors.textNeutral,
     fontSize: typography.fontSize.body,
     fontWeight: '600',
  },
  toggleSubtitle: {
     color: colors.textMuted,
     fontSize: typography.fontSize.caption,
     marginTop: 4,
     maxWidth: 220,
  },
  actions: {
     marginTop: spacing.xl,
  },
  saveBtn: {
     backgroundColor: colors.primary,
     height: 50,
     borderRadius: borderRadius.full,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: spacing.lg,
  },
  saveBtnText: {
     color: colors.surface,
     fontSize: typography.fontSize.body,
     fontWeight: 'bold',
  },
  deleteBtn: {
     height: 50,
     justifyContent: 'center',
     alignItems: 'center',
  },
  deleteBtnText: {
     color: colors.danger,
     fontSize: typography.fontSize.body,
     fontWeight: '600',
  },
});

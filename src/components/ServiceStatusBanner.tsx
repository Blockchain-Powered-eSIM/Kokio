import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useBffHealth } from '@/hooks/useBffHealth';
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) => StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingBottom:   10,
    gap:             8,
  },
  text: {
    color:      colors.destructiveForeground,
    fontSize:   13,
    fontWeight: '500',
    flex:       1,
  },
});

export function ServiceStatusBanner() {
  const styles = useThemedStyles(createStyles);
  const { isHealthy } = useBffHealth();
  const insets = useSafeAreaInsets();

  if (isHealthy) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Ionicons name="warning-outline" size={16} color={styles.text.color} />
      <ThemedText style={styles.text}>
        Service experiencing issues. Some features may be unavailable.
      </ThemedText>
    </View>
  );
}

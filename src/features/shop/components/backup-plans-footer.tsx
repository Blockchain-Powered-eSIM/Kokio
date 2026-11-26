import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useColors } from "@/hooks/use-colors";
import { Theme } from "@/theme/colors";
import { PillButton } from "@/components/ui/pill-button";

type BackupPlansFooterProps = {
  onPress: () => void;
  isLoading: boolean;
  isError: boolean;
};

const BackupPlansFooter = ({ onPress, isLoading, isError }: BackupPlansFooterProps) => {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {isError ? (
        <ThemedText style={[styles.errorText, { color: colors.mutedForeground }]}>
          {"Couldn't load more plans"}
        </ThemedText>
      ) : null}
      <PillButton
        variant="outline"
        onPress={onPress}
        loading={isLoading}
        icon={<Ionicons name={isError ? "refresh" : "add-circle-outline"} size={18} color={colors.primary} />}
      >
        {isError ? "Try again" : "Show more plans"}
      </PillButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.md,
  },
  errorText: {
    textAlign: "center",
    marginBottom: Theme.spacing.sm,
  },
});

export default BackupPlansFooter;

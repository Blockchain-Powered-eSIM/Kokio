import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useSetEsimLabel } from "@/hooks/useEsimLabel";
import { esimDisplayName } from "@/helpers/esimDisplay";
import type { ESimDocument } from "@/utils/bff/esim";

interface EsimLabelEditorProps {
  doc: ESimDocument;
  color: string;
  textStyle?: StyleProp<TextStyle>;
}

export default function EsimLabelEditor({ doc, color, textStyle }: EsimLabelEditorProps) {
  const colors = useColors();
  const setLabel = useSetEsimLabel();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const isUnnamed = !doc.label?.trim();

  const startEditing = () => {
    setDraft(doc.label ?? "");
    setIsEditing(true);
  };

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }
    setLabel.mutate(
      { eSimRef: doc.eSimRef, label: trimmed },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  if (isEditing) {
    return (
      <View style={styles.editRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          maxLength={50}
          autoFocus
          placeholder="Name this eSIM"
          placeholderTextColor={colors.inactive}
          onSubmitEditing={save}
          returnKeyType="done"
          style={[styles.input, textStyle, { color }]}
        />
        <TouchableOpacity
          onPress={save}
          disabled={setLabel.isPending}
          accessibilityRole="button"
          accessibilityLabel="Save eSIM name"
          hitSlop={8}
          style={[styles.iconCircle, { backgroundColor: colors.successBackground }]}
        >
          {setLabel.isPending ? (
            <ActivityIndicator size="small" color={colors.success} />
          ) : (
            <Ionicons name="checkmark" size={18} color={colors.success} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsEditing(false)}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing eSIM name"
          hitSlop={8}
          style={[styles.iconCircle, { backgroundColor: colors.destructiveBackground }]}
        >
          <Ionicons name="close" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {/* Single line, truncated with an ellipsis rather than wrapped - every
          card stays the same compact height regardless of name length. */}
      <Text style={[styles.name, textStyle, { color }]} numberOfLines={1}>
        {esimDisplayName(doc)}
      </Text>
      <TouchableOpacity
        onPress={startEditing}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={isUnnamed ? "Name this eSIM" : "Edit eSIM name"}
        style={isUnnamed ? [styles.namePill, { backgroundColor: colors.primary }] : styles.pencil}
      >
        <Ionicons
          name="pencil-outline"
          size={isUnnamed ? 12 : 14}
          color={isUnnamed ? colors.primaryForeground : color}
        />
        {isUnnamed ? (
          <Text style={[styles.namePillText, { color: colors.primaryForeground }]}>Name</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    padding: 0,
  },
  pencil: {
    paddingVertical: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  namePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

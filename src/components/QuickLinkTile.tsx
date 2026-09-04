import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { QuickLink } from "@/types";

export default function QuickLinkTile({ link, onPress }: { link: QuickLink; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress ?? (() => undefined)} activeOpacity={0.75}>
      <Ionicons name={link.icon} size={22} color={colors.primary} />
      <Text style={[typography.bodyStrong, styles.label]} numberOfLines={1}>
        {link.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "31%",
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: 6,
    shadowColor: "#0F2A5D",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  label: {
    fontSize: 12,
    textAlign: "center",
  },
});

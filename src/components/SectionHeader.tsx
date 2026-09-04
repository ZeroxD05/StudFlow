import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, spacing, typography } from "@/theme/theme";

type Props = {
  title: string;
  subtitle?: string;
  onlineIndicator?: boolean;
  actionLabel?: string;
  onActionPress?: () => void;
};

export default function SectionHeader({ title, subtitle, onlineIndicator, actionLabel, onActionPress }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <View style={styles.titleRow}>
          {onlineIndicator ? <View style={styles.onlineIndicator} /> : null}
          <Text style={typography.h2}>{title}</Text>
        </View>
        {subtitle ? <Text style={[typography.body, styles.subtitle]}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <TouchableOpacity onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  onlineIndicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  action: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
});

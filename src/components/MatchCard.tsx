import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "@/components/Card";
import { colors, radius, spacing, typography } from "@/theme/theme";

export type MatchCardProps = {
  name: string;
  degree: string;
  summary: string;
  tags: string[];
  matchScore: number;
  requestSent?: boolean;
  onPress?: () => void;
};

export default function MatchCard({ name, degree, summary, tags, matchScore, requestSent, onPress }: MatchCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3}>{name}</Text>
          <Text style={typography.caption}>{degree}</Text>
        </View>
        <View style={styles.actionBadge}>
          <Ionicons name={requestSent ? "checkmark-circle" : "person-add"} size={18} color={requestSent ? colors.primary : colors.textMuted} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{matchScore}%</Text>
        </View>
      </View>

      <Text style={styles.summary}>{summary}</Text>

      <View style={styles.tagsRow}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>Match ansehen</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "800",
  },
  actionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  tag: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: colors.white,
    fontWeight: "700",
  },
});

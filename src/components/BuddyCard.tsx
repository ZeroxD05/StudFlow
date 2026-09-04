import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Card from "@/components/Card";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { BuddyProfile } from "@/types";

export default function BuddyCard({ profile, onConnect }: { profile: BuddyProfile; onConnect?: () => void }) {
  const initial = profile.name.charAt(0).toUpperCase();

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={typography.h3}>{profile.name}</Text>
          <Text style={typography.caption}>
            {profile.degree} · {profile.semester}. Semester · {profile.campus}
          </Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchText}>{profile.matchScore}%</Text>
        </View>
      </View>

      <View style={styles.tagsBlock}>
        <Text style={styles.tagsLabel}>Bietet an</Text>
        <View style={styles.tagsRow}>
          {profile.offers.map((skill) => (
            <View key={skill} style={[styles.tag, styles.offerTag]}>
              <Text style={styles.offerTagText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tagsBlock}>
        <Text style={styles.tagsLabel}>Sucht</Text>
        <View style={styles.tagsRow}>
          {profile.wants.map((skill) => (
            <View key={skill} style={[styles.tag, styles.wantTag]}>
              <Text style={styles.wantTagText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.connectButton, profile.connected && styles.connectedButton]}
        onPress={onConnect}
        activeOpacity={0.85}
      >
        <Text style={styles.connectText}>{profile.connected ? "Verbunden" : "Anfrage senden"}</Text>
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
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 17,
  },
  matchBadge: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  matchText: {
    color: colors.success,
    fontWeight: "800",
    fontSize: 12,
  },
  tagsBlock: {
    marginBottom: spacing.sm,
  },
  tagsLabel: {
    ...typography.caption,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offerTag: {
    backgroundColor: "rgba(124,108,255,0.15)",
  },
  offerTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  wantTag: {
    backgroundColor: "rgba(255,122,89,0.15)",
  },
  wantTagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  connectedButton: {
    backgroundColor: colors.success,
  },
  connectButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  connectText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Card from "@/components/Card";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { JobListing } from "@/types";

const typeColors: Record<JobListing["type"], string> = {
  Werkstudent: colors.primary,
  Praktikum: colors.accent,
  Minijob: colors.accentAlt,
};

export default function JobCard({
  job,
  onPress,
  onToggleSave,
}: {
  job: JobListing;
  onPress?: () => void;
  onToggleSave?: () => void;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.typeBadge, { backgroundColor: `${typeColors[job.type]}22` }]}>
          <Text style={[styles.typeText, { color: typeColors[job.type] }]}>{job.type}</Text>
        </View>
        <TouchableOpacity onPress={onToggleSave} style={styles.saveButton} activeOpacity={0.8}>
          <Text style={styles.saveText}>{job.saved ? "Gespeichert" : "Speichern"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Text style={[typography.h3, styles.title]}>{job.title}</Text>
        <Text style={typography.body}>
          {job.company} · {job.location}
        </Text>

        <View style={styles.tagsRow}>
          {job.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  typeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  saveButton: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11,
  },
  title: {
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.sm,
  },
  tag: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});

import React, { useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import JobCard from "@/components/JobCard";
import { toggleSavedJob, useAppDb } from "@/data/db";
import { colors, radius, spacing, typography } from "@/theme/theme";
import { JobListing } from "@/types";

const filters: Array<JobListing["type"] | "Alle"> = ["Alle", "Werkstudent", "Praktikum", "Minijob"];

const demoJobs: JobListing[] = [];

export default function JobsScreen() {
  const [activeFilter, setActiveFilter] = useState<JobListing["type"] | "Alle">("Alle");
  const { jobListings } = useAppDb();

  const list = jobListings.length > 0 ? jobListings : demoJobs;
  const filtered = useMemo(
    () => list.filter((job) => activeFilter === "Alle" || job.type === activeFilter),
    [activeFilter, list]
  );

  if (filtered.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.emptyContainer}>
          <Text style={typography.h1}>Jobs & Praktika</Text>
          <Text style={[typography.body, { marginTop: 8, textAlign: "center" }]}>Zurzeit sind keine Stellen verfügbar.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.h1}>Jobs & Praktika</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>In der Pro-Version kannst du eigene Stellen hinzufügen und speichern.</Text>

        <View style={styles.filterRow}>
          {filters.map((f) => {
            const active = f === activeFilter;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setActiveFilter(f)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => Alert.alert(item.title, `${item.company} · ${item.location}`)}
            onToggleSave={() => toggleSavedJob(item.id)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  filterText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
});

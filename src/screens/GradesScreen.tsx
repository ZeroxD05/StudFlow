import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateDb, useAppDb } from "@/data/db";
import { GradeEntry } from "@/types";
import { colors, radius, spacing, typography } from "@/theme/theme";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  course: "",
  topic: "",
  grade: "",
  date: getTodayDate(),
};

export default function GradesScreen() {
  const { gradeEntries } = useAppDb();
  const [form, setForm] = useState(emptyForm);
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  const addGrade = () => {
    if (!form.course.trim() || !form.topic.trim() || !form.grade.trim()) {
      Alert.alert("Fehlende Angaben", "Kurs, Themengebiet und Note sind erforderlich.");
      return;
    }

    if (isSavingGrade) {
      return;
    }

    setIsSavingGrade(true);
    setTimeout(() => {
      const entry: GradeEntry = {
        id: `grade-${Date.now()}`,
        course: form.course.trim(),
        topic: form.topic.trim(),
        grade: form.grade.trim(),
        date: form.date || getTodayDate(),
      };

      updateDb((draft) => ({ ...draft, gradeEntries: [entry, ...draft.gradeEntries] }));
      setForm({ ...emptyForm, date: getTodayDate() });
      setIsSavingGrade(false);
      Alert.alert("Note gespeichert", "Deine Note wurde erfolgreich eingetragen.");
    }, 600);
  };

  const removeGrade = (id: string) => {
    updateDb((draft) => ({ ...draft, gradeEntries: draft.gradeEntries.filter((entry) => entry.id !== id) }));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={typography.h1}>Noten</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>Trage deine Noten und zugehörigen Themengebiete selbst ein.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Kurs</Text>
          <TextInput value={form.course} onChangeText={(value) => setForm((prev) => ({ ...prev, course: value }))} style={styles.input} placeholder="Mathe" />

          <Text style={styles.label}>Themengebiet</Text>
          <TextInput value={form.topic} onChangeText={(value) => setForm((prev) => ({ ...prev, topic: value }))} style={styles.input} placeholder="Analysis" />

          <Text style={styles.label}>Note</Text>
          <TextInput value={form.grade} onChangeText={(value) => setForm((prev) => ({ ...prev, grade: value }))} style={styles.input} placeholder="1,7" />

          <Text style={styles.label}>Datum</Text>
          <TextInput value={form.date} onChangeText={(value) => setForm((prev) => ({ ...prev, date: value }))} style={styles.input} placeholder="2026-08-24" />

          <TouchableOpacity style={styles.primaryButton} onPress={addGrade} disabled={isSavingGrade}>
            <View style={styles.buttonContent}>
              {isSavingGrade ? <ActivityIndicator size="small" color={colors.white} style={styles.loader} /> : null}
              <Text style={styles.primaryButtonText}>Note speichern</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[typography.h3, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>Meine Einträge</Text>
        {gradeEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Noch keine Noten eingetragen.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {gradeEntries.map((item) => (
              <View key={item.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryCourse}>{item.course}</Text>
                  <Text style={styles.entryTopic}>{item.topic}</Text>
                  <Text style={styles.entryDate}>{item.date}</Text>
                </View>
                <View style={styles.gradeTag}>
                  <Text style={styles.gradeTagText}>{item.grade}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => removeGrade(item.id)}>
                  <Text style={styles.deleteButtonText}>Entfernen</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    includeFontPadding: false,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginRight: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
  list: {
    gap: 8,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  entryCourse: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  entryTopic: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  entryDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  gradeTag: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 54,
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  gradeTagText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 15,
  },
  deleteButton: {
    marginLeft: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
  },
  deleteButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
  },
});

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateDb, useAppDb } from "@/data/db";
import { ScheduleItem } from "@/types";
import { colors, radius, spacing, typography } from "@/theme/theme";

const weekDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

type ScheduleEntryInput = {
  id: string;
  time: string;
  course: string;
  room: string;
  type: ScheduleItem["type"];
};

const createEmptyEntry = (): ScheduleEntryInput => ({
  id: `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  time: "",
  course: "",
  room: "",
  type: "Vorlesung",
});

const createEmptyWeekMap = () =>
  weekDays.reduce((acc, day) => {
    acc[day] = [] as ScheduleEntryInput[];
    return acc;
  }, {} as Record<string, ScheduleEntryInput[]>);

export default function ScheduleImportScreen() {
  const db = useAppDb();
  const [selectedDay, setSelectedDay] = useState<string>(weekDays[0]);
  const [entriesByDay, setEntriesByDay] = useState<Record<string, ScheduleEntryInput[]>>(createEmptyWeekMap());
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [dayScrollPosition, setDayScrollPosition] = useState(0);
  const [dayContentWidth, setDayContentWidth] = useState(0);
  const [dayViewportWidth, setDayViewportWidth] = useState(0);

  useEffect(() => {
    const next = createEmptyWeekMap();

    if (db.todaySchedule.length > 0) {
      db.todaySchedule.forEach((item) => {
        if (!next[item.day]) {
          next[item.day] = [];
        }

        next[item.day].push({
          id: item.id,
          time: item.time,
          course: item.course,
          room: item.room,
          type: item.type,
        });
      });
    }

    setEntriesByDay(next);
  }, [db.todaySchedule]);

  const updateEntry = (day: string, itemId: string, field: keyof Pick<ScheduleEntryInput, "time" | "course" | "room">, value: string) => {
    setEntriesByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addEntry = (day: string) => {
    setEntriesByDay((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), createEmptyEntry()],
    }));
  };

  const deleteEntry = (day: string, itemId: string) => {
    setEntriesByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((item) => item.id !== itemId),
    }));
  };

  const saveManualSchedule = () => {
    if (isSavingSchedule) {
      return;
    }

    setIsSavingSchedule(true);
    setTimeout(() => {
      const parsed: ScheduleItem[] = weekDays.flatMap((day) =>
        (entriesByDay[day] ?? [])
          .filter((entry) => entry.time.trim() && entry.course.trim())
          .map((entry, index) => ({
            id: entry.id || `manual-${day}-${Date.now()}-${index}`,
            day,
            time: entry.time.trim(),
            course: entry.course.trim(),
            room: entry.room.trim() || "Raum TBD",
            type: entry.type,
          }))
      );

      updateDb((draft) => ({ ...draft, todaySchedule: parsed }));
      setIsSavingSchedule(false);
      Alert.alert("Stundenplan gespeichert", "Die Einträge wurden für die jeweiligen Tage gespeichert.");
    }, 600);
  };

  const currentEntries = entriesByDay[selectedDay] ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={typography.h1}>Stundenplan</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>Mehrere Fächer pro Tag, einfach speichern und später bearbeiten.</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          directionalLockEnabled
          scrollEventThrottle={16}
          onScroll={(event) => setDayScrollPosition(event.nativeEvent.contentOffset.x)}
          onContentSizeChange={(width) => setDayContentWidth(width)}
          onLayout={(event) => setDayViewportWidth(event.nativeEvent.layout.width)}
        >
          {weekDays.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>{day.slice(0, 2)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.dayScrollTrack}>
          <View
            style={[
              styles.dayScrollThumb,
              dayContentWidth > dayViewportWidth && {
                width: `${Math.max(24, (dayViewportWidth / dayContentWidth) * 100)}%`,
                left: `${Math.min(100 - Math.max(24, (dayViewportWidth / dayContentWidth) * 100), (dayScrollPosition / (dayContentWidth - dayViewportWidth)) * (100 - Math.max(24, (dayViewportWidth / dayContentWidth) * 100)))}%`,
              },
            ]}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedDay}</Text>

          {currentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Noch keine Einträge für {selectedDay}.</Text>
            </View>
          ) : (
            currentEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <TextInput
                  value={entry.time}
                  onChangeText={(value) => updateEntry(selectedDay, entry.id, "time", value)}
                  placeholder="08:00 – 09:30"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={entry.course}
                  onChangeText={(value) => updateEntry(selectedDay, entry.id, "course", value)}
                  placeholder="Fach"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
                <TextInput
                  value={entry.room}
                  onChangeText={(value) => updateEntry(selectedDay, entry.id, "room", value)}
                  placeholder="Raum"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteEntry(selectedDay, entry.id)}
                >
                  <Text style={styles.deleteButtonText}>Entfernen</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => addEntry(selectedDay)}>
              <Text style={styles.secondaryButtonText}>+ hinzufügen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={saveManualSchedule} disabled={isSavingSchedule}>
              <View style={styles.buttonContent}>
                {isSavingSchedule ? <ActivityIndicator size="small" color={colors.white} style={styles.loader} /> : null}
                <Text style={styles.primaryButtonText}>Speichern</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
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
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  tabsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  dayScrollTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  dayScrollThumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "24%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  dayTab: {
    width: 64,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  dayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dayTabTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: spacing.md,
  },
  emptyState: {
    paddingVertical: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
  },
  entryCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: "transparent",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    fontSize: 16,
    includeFontPadding: false,
  },
  deleteButton: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  deleteButtonText: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "800",
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
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
  },
});

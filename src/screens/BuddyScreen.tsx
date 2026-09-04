import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BuddyCard from "@/components/BuddyCard";
import { useAppDb, toggleBuddyConnection } from "@/data/db";
import { colors, radius, spacing, typography } from "@/theme/theme";

export default function BuddyScreen() {
  const [query, setQuery] = useState("");
  const { buddyProfiles } = useAppDb();

  const filtered = buddyProfiles.filter((profile) => {
    const q = query.toLowerCase();
    return (
      profile.name.toLowerCase().includes(q) ||
      profile.degree.toLowerCase().includes(q) ||
      profile.offers.some((s) => s.toLowerCase().includes(q)) ||
      profile.wants.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={typography.h1}>Buddys & SkillSwap</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>Tausche Skills statt Geld für Nachhilfe auszugeben.</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nach Skill, Name oder Studiengang suchen"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <BuddyCard profile={item} onConnect={() => toggleBuddyConnection(item.id)} />}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    includeFontPadding: false,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
});

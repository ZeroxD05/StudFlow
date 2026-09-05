import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { deleteCurrentUser, logoutUser, updateCurrentUser, useAppDb } from "@/data/db";
import { colors, radius, spacing } from "@/theme/theme";

export default function ProfileScreen() {
  const db = useAppDb();
  const currentUser = db.users.find((user) => user.id === db.currentUserId) ?? null;
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isProfileDataOpen, setIsProfileDataOpen] = useState(false);
  const [form, setForm] = useState({
    name: currentUser?.name ?? "",
    linkedEmail: currentUser?.linkedEmail ?? "",
    campus: currentUser?.campus ?? "",
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setForm({
      name: currentUser.name,
      linkedEmail: currentUser.linkedEmail ?? "",
      campus: currentUser.campus,
    });
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const saveProfile = () => {
    if (isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);
    setTimeout(() => {
      try {
        updateCurrentUser({
          name: form.name,
          linkedEmail: form.linkedEmail,
          campus: form.campus,
        });
      } catch (error: any) {
        setIsSavingProfile(false);
        Alert.alert("Eingabe ungültig", error?.message ?? "Bitte prüfe deine Angaben.");
        return;
      }
      setIsSavingProfile(false);
      Alert.alert("Profil gespeichert", "Deine Änderungen wurden aktualisiert.");
    }, 600);
  };

  const uploadImage = async () => {
    if (isUploadingImage) {
      return;
    }

    setIsUploadingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Zugriff fehlt", "Bitte erlaube den Zugriff auf deine Bilder.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0]?.uri ?? null;
        updateCurrentUser({ profileImage: imageUri });
        Alert.alert("Foto gespeichert", "Das Profilbild wurde aktualisiert.");
      }
    } catch (error: any) {
      Alert.alert("Profilbild konnte nicht geladen werden", error?.message ?? "Bitte versuche es erneut.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Konto löschen?",
      "Dein Profil, deine Freundesverbindungen und deine persönlichen Daten werden dauerhaft gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Endgültig löschen", style: "destructive", onPress: deleteCurrentUser },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageEyebrow}>DEIN KONTO</Text>
        <Text style={styles.pageTitle}>Profil</Text>
        <Text style={styles.pageSubtitle}>Verwalte deine Daten und deine Sichtbarkeit.</Text>

        <View style={styles.profileHero}>
          <View style={styles.headerRow}>
            {currentUser.profileImage ? (
              <Image source={{ uri: currentUser.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: currentUser.avatarColor }]}> 
                <Text style={styles.avatarText}>{currentUser.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.identityBlock}>
              <Text style={styles.profileName}>{currentUser.name}</Text>
              <Text style={styles.profileHandle}>{currentUser.username}@study2buddy.de</Text>
              <View style={styles.accountBadge}>
                <View style={[styles.accountBadgeDot, currentUser.showOnlineStatus === false && styles.accountBadgeDotHidden]} />
                <Text style={styles.accountBadgeText}>{currentUser.showOnlineStatus === false ? "Unsichtbares Konto" : "Aktives Konto"}</Text>
              </View>
              <Text style={styles.friendCount}>{(currentUser.friends ?? []).length} {(currentUser.friends ?? []).length === 1 ? "Freund" : "Freunde"}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={uploadImage} disabled={isUploadingImage}>
            <View style={styles.buttonContent}>
              {isUploadingImage ? <ActivityIndicator size="small" color={colors.primary} style={styles.loader} /> : null}
              <Text style={styles.uploadButtonText}>Profilbild ändern</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.activitySetting}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>●</Text>
          </View>
          <View style={styles.activitySettingText}>
            <Text style={styles.sectionLabel}>SICHTBARKEIT</Text>
            <Text style={styles.activitySettingTitle}>Aktivitätsstatus anzeigen</Text>
            <Text style={styles.activitySettingHint}>Deine Freunde sehen, ob du gerade online bist.</Text>
          </View>
          <Switch
            value={currentUser.showOnlineStatus !== false}
            onValueChange={(value) => { updateCurrentUser({ showOnlineStatus: value }); }}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.activitySetting}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>•</Text>
          </View>
          <View style={styles.activitySettingText}>
            <Text style={styles.sectionLabel}>STUNDENPLAN</Text>
            <Text style={styles.activitySettingTitle}>Kurs-Erinnerungen</Text>
            <Text style={styles.activitySettingHint}>Erinnert dich fünf Minuten vor dem Kurs an Fach, Raum und Uhrzeit.</Text>
          </View>
          <Switch
            value={currentUser.scheduleRemindersEnabled !== false}
            onValueChange={(value) => { updateCurrentUser({ scheduleRemindersEnabled: value }); }}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.activitySetting}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>!</Text>
          </View>
          <View style={styles.activitySettingText}>
            <Text style={styles.sectionLabel}>BENACHRICHTIGUNGEN</Text>
            <Text style={styles.activitySettingTitle}>Alle Benachrichtigungen stummschalten</Text>
            <Text style={styles.activitySettingHint}>Blendet alle ungelesenen DM-Hinweise in der App aus.</Text>
          </View>
          <Switch
            value={currentUser.notificationsMuted === true}
            onValueChange={(value) => { updateCurrentUser({ notificationsMuted: value }); }}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => setIsProfileDataOpen((open) => !open)} activeOpacity={0.75}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Profildaten</Text>
              <Text style={styles.sectionDescription}>Diese Angaben sehen andere Nutzer in deinem Profil.</Text>
            </View>
            <Text style={styles.chevron}>{isProfileDataOpen ? "⌃" : "⌄"}</Text>
          </TouchableOpacity>

          {isProfileDataOpen ? (
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} style={styles.input} />

              <Text style={styles.label}>Benutzername</Text>
              <TextInput value={currentUser.username} editable={false} style={[styles.input, styles.lockedInput]} />
              <Text style={styles.fieldHint}>Eine Änderung ist nur über den Ata-Support möglich.</Text>

              <Text style={styles.label}>Uni-Mail</Text>
              <TextInput
                value={form.linkedEmail}
                onChangeText={(value) => setForm((prev) => ({ ...prev, linkedEmail: value }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="name@deine-uni.de"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <Text style={styles.label}>Campus</Text>
              <TextInput value={form.campus} onChangeText={(value) => setForm((prev) => ({ ...prev, campus: value }))} style={styles.input} />

              <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={isSavingProfile}>
                <View style={styles.buttonContent}>
                  {isSavingProfile ? <ActivityIndicator size="small" color={colors.white} style={styles.loader} /> : null}
                  <Text style={styles.primaryButtonText}>Profil speichern</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.accountActions}>
          <Text style={styles.sectionTitle}>Konto</Text>
          <Text style={styles.sectionDescription}>Dein Benutzername ist fest mit deiner App-Mail verbunden.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={logoutUser}>
            <Text style={styles.secondaryButtonText}>Abmelden</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={confirmDeleteAccount}>
            <Text style={styles.deleteButtonText}>Konto löschen</Text>
          </TouchableOpacity>
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
    maxWidth: 760,
    alignSelf: "center",
  },
  pageEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 4,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  profileHero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  identityBlock: {
    flex: 1,
  },
  profileName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  profileHandle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 3,
  },
  friendCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 9,
  },
  accountBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  accountBadgeDotHidden: {
    backgroundColor: colors.textMuted,
  },
  accountBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  uploadButton: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  uploadButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  activitySetting: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(31,157,115,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  settingIconText: {
    color: colors.success,
    fontSize: 18,
  },
  activitySettingText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  activitySettingTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
  },
  activitySettingHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginRight: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderText: {
    flex: 1,
  },
  chevron: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
    marginLeft: spacing.md,
  },
  sectionLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
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
  lockedInput: {
    color: colors.textMuted,
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: "top",
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteButtonText: {
    color: "#C0392B",
    fontWeight: "700",
  },
  accountActions: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
});

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { createTenant, createTenantAdmin, createUniversityNews, deleteCurrentUser, deleteTenant, deleteUniversityNews, listTenants, logoutUser, updateCurrentUser, updateTenant, updateUniversityNews, useAppDb } from "@/data/db";
import { colors, radius, spacing } from "@/theme/theme";

export default function ProfileScreen() {
  const db = useAppDb();
  const currentUser = db.users.find((user) => user.id === db.currentUserId) ?? null;
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isProfileDataOpen, setIsProfileDataOpen] = useState(false);
  const [legalPage, setLegalPage] = useState<"imprint" | "privacy" | "terms" | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [tenantDomain, setTenantDomain] = useState("");
  const [tenantAdminEmail, setTenantAdminEmail] = useState("");
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; emailDomain?: string; adminEmail?: string }>>([]);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingAdminEmail, setEditingAdminEmail] = useState("");
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({ tenantId: "", name: "", username: "", linkedEmail: "", password: "" });
  const isCentralAdmin = currentUser?.username === "ata";
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

  useEffect(() => {
    if (currentUser?.role === "admin") {
      listTenants().then(setTenants).catch(() => undefined);
    }
  }, [currentUser?.id, currentUser?.role]);

  if (!currentUser) {
    return null;
  }

  if (legalPage) {
    const isImprint = legalPage === "imprint";
    const isTerms = legalPage === "terms";
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.legalHeader}>
          <TouchableOpacity style={styles.legalBackButton} onPress={() => setLegalPage(null)} hitSlop={8}>
            <Ionicons name="arrow-back" size={23} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.legalHeaderTitle}>{isImprint ? "Impressum" : isTerms ? "Nutzungsbedingungen" : "Datenschutzerklärung"}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.legalContent} showsVerticalScrollIndicator={false}>
          {isImprint ? (
            <>
              <Text style={styles.legalTitle}>Impressum</Text>
              <Text style={styles.legalHeading}>Angaben gemäß § 5 TMG</Text>
              <Text style={styles.legalText}>Ata Zeran{"\n"}Reclamstraße 4{"\n"}22111 Hamburg</Text>
              <Text style={styles.legalHeading}>Kontakt</Text>
              <Text style={styles.legalText}>Telefon: 015753515471{"\n"}E-Mail: ata2005hh@gmail.com</Text>
              <Text style={styles.legalHeading}>Verantwortlich für den Inhalt</Text>
              <Text style={styles.legalText}>Ata Zeran, Reclamstraße 4, 22111 Hamburg</Text>
            </>
          ) : isTerms ? (
            <>
              <Text style={styles.legalTitle}>Nutzungsbedingungen</Text>
              <Text style={styles.legalText}>Mit der Nutzung von StudFlow akzeptierst du diese Nutzungsbedingungen.</Text>
              <Text style={styles.legalHeading}>Zweck der App</Text>
              <Text style={styles.legalText}>StudFlow unterstützt dich bei Organisation, Stundenplanung, Community-Austausch und Direktnachrichten im Studienalltag.</Text>
              <Text style={styles.legalHeading}>Konto und Zugang</Text>
              <Text style={styles.legalText}>Du bist für die Richtigkeit deiner Kontodaten und für den Schutz deiner Zugangsdaten verantwortlich. Teile dein Passwort nicht mit anderen Personen.</Text>
              <Text style={styles.legalHeading}>Faire Nutzung</Text>
              <Text style={styles.legalText}>Behandle andere Nutzer respektvoll. Verboten sind insbesondere Belästigung, Bedrohungen, rechtswidrige Inhalte, Spam, Missbrauch von Konten und das unbefugte Auslesen oder Stören der App.</Text>
              <Text style={styles.legalHeading}>Community und Nachrichten</Text>
              <Text style={styles.legalText}>Beiträge und Nachrichten dürfen keine Rechte Dritter verletzen. Du kannst Personen blockieren, entfernen oder Benachrichtigungen stummschalten. Rechtswidrige oder gemeldete Inhalte können entfernt werden.</Text>
              <Text style={styles.legalHeading}>Verfügbarkeit</Text>
              <Text style={styles.legalText}>StudFlow wird nach Möglichkeit verfügbar gehalten. Ein Anspruch auf jederzeitige Verfügbarkeit, bestimmte Funktionen oder dauerhafte Speicherung besteht nicht.</Text>
              <Text style={styles.legalHeading}>Konto löschen</Text>
              <Text style={styles.legalText}>Du kannst dein Konto direkt in der App löschen. Gesetzliche Aufbewahrungspflichten und technisch notwendige Sicherungskopien können davon unberührt bleiben.</Text>
              <Text style={styles.legalHeading}>Kontakt</Text>
              <Text style={styles.legalText}>Ata Zeran{"\n"}ata2005hh@gmail.com</Text>
              <Text style={styles.legalHeading}>Stand</Text>
              <Text style={styles.legalText}>September 2026</Text>
            </>
          ) : (
            <>
              <Text style={styles.legalTitle}>Datenschutzerklärung</Text>
              <Text style={styles.legalText}>Diese Datenschutzerklärung informiert darüber, welche personenbezogenen Daten in StudFlow verarbeitet werden.</Text>
              <Text style={styles.legalHeading}>Verantwortlicher</Text>
              <Text style={styles.legalText}>Ata Zeran{"\n"}Reclamstraße 4, 22111 Hamburg{"\n"}E-Mail: ata2005hh@gmail.com</Text>
              <Text style={styles.legalHeading}>Verarbeitete Daten</Text>
              <Text style={styles.legalText}>Bei Registrierung und Nutzung können Name, Benutzername, E-Mail-Adresse, Profilbild, Campusdaten, Stundenplan, Direktnachrichten und Community-Beiträge verarbeitet werden.</Text>
              <Text style={styles.legalHeading}>Zwecke und Speicherung</Text>
              <Text style={styles.legalText}>Die Daten werden zur Bereitstellung der App-Funktionen, zur Kontoverwaltung, zur Synchronisierung zwischen Geräten und zur Anzeige von Nachrichten und Stundenplan-Erinnerungen verarbeitet. Lokale Daten können auf dem Gerät gespeichert werden; synchronisierte Daten werden über den eingesetzten App-Server gespeichert.</Text>
              <Text style={styles.legalHeading}>Bildauswahl und externe Dienste</Text>
              <Text style={styles.legalText}>Der Zugriff auf die Mediathek erfolgt nur, wenn du ein Profilbild auswählst. Für die technische Bereitstellung werden folgende Dienste eingesetzt: Render für das Backend unter studflow.onrender.com und Supabase für die serverseitige Speicherung.</Text>
              <Text style={styles.legalHeading}>Supabase-Konfiguration</Text>
              <Text style={styles.legalText}>Die App verwendet ein Supabase-Projekt als serverseitige Datenbank. Gespeichert wird der zentrale StudFlow-Zustand in der Tabelle „studflow_state“ als JSON-Daten. Der Supabase-Service-Key wird ausschließlich serverseitig verwendet und nicht an die App ausgeliefert. Row Level Security ist für die Tabelle aktiviert; direkter Zugriff für anonyme und authentifizierte Datenbanknutzer ist deaktiviert.</Text>
              <Text style={styles.legalHeading}>Hosting und Serverstandort</Text>
              <Text style={styles.legalText}>Das Backend wird über Render bereitgestellt; der Render-Service ist im Projekt für die Region Frankfurt konfiguriert. Die Datenbank wird über Supabase auf AWS in der Region eu-west-1 (Irland) betrieben.</Text>
              <Text style={styles.legalHeading}>Deine Rechte</Text>
              <Text style={styles.legalText}>Du kannst Auskunft, Berichtigung oder Löschung deiner Daten verlangen. Wende dich dafür an ata2005hh@gmail.com. Dein Konto kannst du außerdem direkt in der App löschen.</Text>
              <Text style={styles.legalHeading}>Stand</Text>
              <Text style={styles.legalText}>September 2026</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
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
              <Text style={styles.profileHandle}>{currentUser.linkedEmail ?? `${currentUser.username}@study2buddy.de`}</Text>
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
        {currentUser.role === "admin" ? (
          <View style={styles.adminCard}>
            <Text style={styles.sectionTitle}>Hochschulverwaltung</Text>
            <Text style={styles.sectionDescription}>Lege getrennte Mandanten für Hochschulen an.</Text>
            <View style={styles.adminCreateRow}>
              <TextInput value={tenantName} onChangeText={setTenantName} placeholder="Name der Hochschule" placeholderTextColor={colors.textMuted} style={styles.adminInput} />
              <TextInput value={tenantDomain} onChangeText={setTenantDomain} placeholder="uni.de" placeholderTextColor={colors.textMuted} style={styles.adminInput} autoCapitalize="none" />
              <TextInput value={tenantAdminEmail} onChangeText={setTenantAdminEmail} placeholder="Admin-Mail" placeholderTextColor={colors.textMuted} style={styles.adminInput} autoCapitalize="none" keyboardType="email-address" />
              <TouchableOpacity style={styles.adminAddButton} onPress={async () => { if (!tenantName.trim() || !tenantDomain.trim() || !tenantAdminEmail.trim()) return; const tenant = await createTenant(tenantName, tenantDomain, tenantAdminEmail); setTenants((current) => [...current, tenant]); setTenantName(""); setTenantDomain(""); setTenantAdminEmail(""); }}>
                <Ionicons name="add" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
            {tenants.map((tenant) => (
              <View key={tenant.id} style={styles.tenantRow}>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{tenant.name}</Text>
                  <Text style={styles.tenantMeta}>{tenant.emailDomain ?? "Keine Domain"} · {tenant.adminEmail ?? "Kein Admin"}</Text>
                </View>
                <View style={styles.tenantActions}>
                  <TouchableOpacity onPress={() => { setEditingTenantId(tenant.id); setEditingAdminEmail(tenant.adminEmail ?? ""); }}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={async () => { await updateTenant(tenant.id, null); setTenants((items) => items.map((item) => item.id === tenant.id ? { ...item, adminEmail: undefined } : item)); }}><Ionicons name="person-remove-outline" size={19} color={colors.accent} /></TouchableOpacity>
                  <TouchableOpacity onPress={async () => { await deleteTenant(tenant.id); setTenants((items) => items.filter((item) => item.id !== tenant.id)); }}><Ionicons name="trash-outline" size={19} color="#C0392B" /></TouchableOpacity>
                </View>
                {editingTenantId === tenant.id ? (
                  <View style={styles.tenantEditRow}>
                    <TextInput value={editingAdminEmail} onChangeText={setEditingAdminEmail} placeholder="Neue Admin-Mail" placeholderTextColor={colors.textMuted} style={styles.adminInput} autoCapitalize="none" keyboardType="email-address" />
                    <TouchableOpacity style={styles.smallSaveButton} onPress={async () => { const updated = await updateTenant(tenant.id, editingAdminEmail); setTenants((items) => items.map((item) => item.id === tenant.id ? { ...item, adminEmail: updated.adminEmail } : item)); setEditingTenantId(null); }}><Text style={styles.smallSaveText}>Speichern</Text></TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
            {!isCentralAdmin ? (
              <>
                <Text style={styles.adminSubheading}>News veröffentlichen</Text>
                <TextInput value={newsTitle} onChangeText={setNewsTitle} placeholder="Titel" placeholderTextColor={colors.textMuted} style={styles.adminInput} />
                <TextInput value={newsBody} onChangeText={setNewsBody} placeholder="Nachricht der Hochschule" placeholderTextColor={colors.textMuted} style={[styles.adminInput, styles.newsAdminInput]} multiline />
                <TouchableOpacity style={styles.primaryButton} onPress={async () => { if (!newsTitle.trim() || !newsBody.trim()) return; await createUniversityNews(newsTitle, newsBody); setNewsTitle(""); setNewsBody(""); }}>
                  <Text style={styles.primaryButtonText}>News veröffentlichen</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {(db.tenantNews ?? []).map((news) => (
              <View key={news.id} style={styles.newsAdminRow}>
                {editingNewsId === news.id ? (
                  <>
                    <TextInput value={newsTitle} onChangeText={setNewsTitle} style={styles.adminInput} placeholder="Titel" placeholderTextColor={colors.textMuted} />
                    <TextInput value={newsBody} onChangeText={setNewsBody} style={[styles.adminInput, styles.newsAdminInput]} placeholder="Text" placeholderTextColor={colors.textMuted} multiline />
                    <View style={styles.newsAdminActions}>
                      <TouchableOpacity style={styles.smallSaveButton} onPress={async () => { await updateUniversityNews(news.id, newsTitle, newsBody); setEditingNewsId(null); setNewsTitle(""); setNewsBody(""); }}><Text style={styles.smallSaveText}>Speichern</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingNewsId(null)}><Text style={styles.cancelText}>Abbrechen</Text></TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.newsAdminTitle}>{news.title}</Text>
                    <Text style={styles.newsAdminBody}>{news.body}</Text>
                    <View style={styles.newsAdminActions}>
                      <TouchableOpacity onPress={() => { setEditingNewsId(news.id); setNewsTitle(news.title); setNewsBody(news.body); }}><Ionicons name="create-outline" size={19} color={colors.primary} /></TouchableOpacity>
                      <TouchableOpacity onPress={async () => { await deleteUniversityNews(news.id); }} hitSlop={8}><Ionicons name="trash-outline" size={19} color="#C0392B" /></TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            ))}
            <Text style={styles.adminSubheading}>Uni-Admin anlegen</Text>
            {(["tenantId", "name", "username", "linkedEmail", "password"] as const).map((field) => (
              <TextInput key={field} value={adminForm[field]} onChangeText={(value) => setAdminForm((current) => ({ ...current, [field]: value }))} placeholder={field === "tenantId" ? "Tenant-ID" : field} placeholderTextColor={colors.textMuted} secureTextEntry={field === "password"} style={[styles.adminInput, field !== "tenantId" && styles.adminFieldSpacing]} autoCapitalize="none" />
            ))}
            <TouchableOpacity style={styles.primaryButton} onPress={async () => { await createTenantAdmin(adminForm); setAdminForm({ tenantId: "", name: "", username: "", linkedEmail: "", password: "" }); }}>
              <Text style={styles.primaryButtonText}>Uni-Admin erstellen</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => setLegalPage("imprint")}>
            <Text style={styles.legalLink}>Impressum</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkDivider}>·</Text>
          <TouchableOpacity onPress={() => setLegalPage("privacy")}>
            <Text style={styles.legalLink}>Datenschutzerklärung</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkDivider}>·</Text>
          <TouchableOpacity onPress={() => setLegalPage("terms")}>
            <Text style={styles.legalLink}>Nutzungsbedingungen</Text>
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
  adminCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md },
  adminCreateRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  adminInput: { flex: 1, minWidth: 150, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: 12 },
  adminAddButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  tenantRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tenantInfo: { flex: 1, minWidth: 0 },
  tenantName: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
  tenantMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  tenantActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  tenantEditRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  smallSaveButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  smallSaveText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  adminSubheading: { color: colors.textPrimary, fontWeight: "800", marginTop: spacing.lg, marginBottom: spacing.sm },
  newsAdminInput: { minHeight: 90, textAlignVertical: "top", marginTop: spacing.sm },
  adminFieldSpacing: { marginTop: spacing.sm },
  newsAdminRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  newsAdminTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 13 },
  newsAdminBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },
  newsAdminActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  cancelText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  legalLink: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  legalLinkDivider: {
    color: colors.border,
    fontSize: 12,
  },
  legalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legalBackButton: {
    marginRight: spacing.md,
  },
  legalHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  legalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  legalTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  legalHeading: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  legalText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
});

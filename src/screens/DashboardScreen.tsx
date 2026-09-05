import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "@/components/Card";
import QuickLinkTile from "@/components/QuickLinkTile";
import SectionHeader from "@/components/SectionHeader";
import { saveCurrentUserSchedule, updateDb, useAppDb } from "@/data/db";
import { GradeEntry } from "@/types";
import { colors, radius, spacing, typography } from "@/theme/theme";

const quickLinkDetails: Record<string, { title: string; body: string; details: string[]; items?: Array<{ label: string; caption: string; icon: keyof typeof Ionicons.glyphMap; url: string }> }> = {
  moodle: {
    title: "Moodle",
    body: "Lerneinheiten, Materialien und Aufgaben in einem Überblick.",
    details: ["Aktuelle Kursseite", "Abgaben und Übungen", "Vorlesungsunterlagen"]
  },
  campus: {
    title: "Campus-Portal",
    body: "Dein zentraler Überblick über Studienstatus und Dienste.",
    details: ["Semesterübersicht", "Anmeldungen", "Studienservice"]
  },
  mail: {
    title: "Uni-Mail",
    body: "Vergünstigungen, Rabatte und Vorteile für Studierende direkt über die Uni-Mail und Campus-Services.",
    details: ["Studierendenrabatte", "Campus-Vorteile", "Spezielle Angebote"],
    items: [
      { label: "Semester-Abo", caption: "Rabatte für öffentliche Verkehrsmittel und Mobilität", icon: "ticket-outline", url: "https://www.google.com/search?q=studentenrabatt+semesterabo" },
      { label: "Kultur & Freizeit", caption: "Vorteile bei Museen, Kino und Veranstaltungen", icon: "film-outline", url: "https://www.google.com/search?q=studentenrabatte+kultur+deutschland" },
      { label: "Essen & Cafés", caption: "Rabatte im Campusbereich und lokale Angebote", icon: "restaurant-outline", url: "https://www.google.com/search?q=studentenrabatte+essen+universitaet" },
      { label: "Software & Tools", caption: "Zugänge zu Learning- und Produktivitäts-Tools", icon: "laptop-outline", url: "https://www.google.com/search?q=studentenrabatte+software+studium" },
    ],
  },
  library: {
    title: "Bibliothek",
    body: "Literatur, Medien und Lernquellen direkt für dein Studium.",
    details: ["Bücher suchen", "Lernmaterialien", "Reservierungen"]
  },
  cafeteria: {
    title: "Mensaplan",
    body: "Öffnungszeiten, Gerichte und Essen im Campusbereich.",
    details: ["Heutige Speisen", "Preisübersicht", "Campusangebote"]
  },
  grades: {
    title: "Noten",
    body: "Trage deine Ergebnisse direkt ein und behalte deine Leistung auf einen Blick.",
    details: ["Aktuelle Prüfungen", "Leistungsübersicht", "Ergebnisse"],
  },
};

const weekdayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
const EXTERNAL_LINK_WARNING_KEY = "studflow-external-link-warning-dismissed";

export default function DashboardScreen({ navigation }: any) {
  const { quickLinks, todaySchedule, currentUserId, users, gradeEntries, tenantNews } = useAppDb();
  const [activeQuickLink, setActiveQuickLink] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ course: "", topic: "", grade: "", date: new Date().toISOString().slice(0, 10) });
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [isSavingDashboardGrade, setIsSavingDashboardGrade] = useState(false);
  const [externalLinkWarningVisible, setExternalLinkWarningVisible] = useState(false);
  const [externalLinkWarningDismissed, setExternalLinkWarningDismissed] = useState(false);
  const [dontShowExternalWarning, setDontShowExternalWarning] = useState(false);
  const [pendingExternalLink, setPendingExternalLink] = useState<string | null>(null);
  const user = users.find((entry) => entry.id === currentUserId) ?? null;
  const activeFriends = user
    ? (user.friends ?? [])
        .map((friendId) => users.find((entry) => entry.id === friendId))
        .filter((friend): friend is NonNullable<typeof friend> => Boolean(friend?.online))
    : [];

  useEffect(() => {
    AsyncStorage.getItem(EXTERNAL_LINK_WARNING_KEY).then((value) => {
      setExternalLinkWarningDismissed(value === "true");
    }).catch(() => undefined);
  }, []);

  const currentDate = new Date();
  const greeting = currentDate.getHours() < 11 ? "Guten Morgen" : currentDate.getHours() < 18 ? "Guten Mittag" : "Guten Abend";
  const todayName = weekdayNames[currentDate.getDay()];
  const todayDateLabel = currentDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const todaysSchedule = todaySchedule.filter((item) => item.day === todayName);
  const toggleScheduleItemCompleted = (itemId: string) => {
    saveCurrentUserSchedule(todaySchedule.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item));
  };
  const selectedQuickLink = activeQuickLink ? quickLinkDetails[activeQuickLink] : null;
  const campusUrl = user?.campus
    ? `https://www.google.com/search?q=${encodeURIComponent(`Campus-Portal ${user.campus}`)}`
    : "https://www.google.com/search?q=Campus+Portal+Universit%C3%A4t";

  const cafeteriaUrl = user?.campus
    ? `https://www.google.com/search?q=${encodeURIComponent(`Mensaplan ${user.campus}`)}`
    : "https://www.google.com/search?q=Mensaplan+Universit%C3%A4t";

  const libraryUrl = user?.campus
    ? `https://www.google.com/search?q=${encodeURIComponent(`Bibliothek ${user.campus}`)}`
    : "https://www.google.com/search?q=Universit%C3%A4tsbibliothek";

  const moodleUrl = user?.campus
    ? `https://www.google.com/search?q=${encodeURIComponent(`Moodle ${user.campus}`)}`
    : "https://www.google.com/search?q=Moodle+Universit%C3%A4t";

  const handleQuickLinkPress = (id: string) => {
    if (["cafeteria", "campus", "library", "moodle"].includes(id)) {
      if (!externalLinkWarningDismissed) {
        setPendingExternalLink(id);
        setDontShowExternalWarning(false);
        setExternalLinkWarningVisible(true);
        return;
      }
    }

    openQuickLink(id);
  };

  const openQuickLink = (id: string) => {
    if (id === "cafeteria") {
      if (Platform.OS === "web") {
        handleOpenLink(cafeteriaUrl);
        return;
      }

      setActiveQuickLink("cafeteria");
      return;
    }

    if (id === "campus") {
      if (Platform.OS === "web") {
        handleOpenLink(campusUrl);
        return;
      }

      setActiveQuickLink("campus");
      return;
    }

    if (id === "library") {
      if (Platform.OS === "web") {
        handleOpenLink(libraryUrl);
        return;
      }

      setActiveQuickLink("library");
      return;
    }

    if (id === "moodle") {
      if (Platform.OS === "web") {
        handleOpenLink(moodleUrl);
        return;
      }

      setActiveQuickLink("moodle");
      return;
    }

    setActiveQuickLink(id);
  };

  const continueToExternalLink = async () => {
    const linkId = pendingExternalLink;
    setExternalLinkWarningVisible(false);
    setPendingExternalLink(null);
    if (dontShowExternalWarning) {
      setExternalLinkWarningDismissed(true);
      await AsyncStorage.setItem(EXTERNAL_LINK_WARNING_KEY, "true");
    }
    if (linkId) openQuickLink(linkId);
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Link konnte nicht geöffnet werden", url);
    }
  };

  const resetGradeForm = () => {
    setGradeForm({ course: "", topic: "", grade: "", date: new Date().toISOString().slice(0, 10) });
    setEditingGradeId(null);
  };

  const addGradeFromDashboard = () => {
    if (!gradeForm.course.trim() || !gradeForm.topic.trim() || !gradeForm.grade.trim()) {
      Alert.alert("Fehlende Angaben", "Kurs, Themenbereich und Note sind erforderlich.");
      return;
    }

    if (isSavingDashboardGrade) {
      return;
    }

    setIsSavingDashboardGrade(true);
    setTimeout(() => {
      const payload = {
        course: gradeForm.course.trim(),
        topic: gradeForm.topic.trim(),
        grade: gradeForm.grade.trim(),
        date: gradeForm.date || new Date().toISOString().slice(0, 10),
      };

      if (editingGradeId) {
        updateDb((draft) => ({
          ...draft,
          gradeEntries: draft.gradeEntries.map((entry) =>
            entry.id === editingGradeId ? { ...entry, ...payload } : entry,
          ),
        }));
        Alert.alert("Note aktualisiert", "Die Notiz wurde erfolgreich bearbeitet.");
      } else {
        const entry: GradeEntry = {
          id: `grade-${Date.now()}`,
          ...payload,
        };

        updateDb((draft) => ({ ...draft, gradeEntries: [entry, ...draft.gradeEntries] }));
        Alert.alert("Note gespeichert", "Deine Noten wurden im Dashboard eingetragen.");
      }

      setIsSavingDashboardGrade(false);
      resetGradeForm();
    }, 600);
  };

  const startEditGrade = (entry: GradeEntry) => {
    setEditingGradeId(entry.id);
    setGradeForm({
      course: entry.course,
      topic: entry.topic,
      grade: entry.grade,
      date: entry.date,
    });
  };

  const removeGrade = (id: string) => {
    updateDb((draft) => ({ ...draft, gradeEntries: draft.gradeEntries.filter((entry) => entry.id !== id) }));
    if (editingGradeId === id) {
      resetGradeForm();
    }
  };

  if (selectedQuickLink) {
    if (activeQuickLink === "cafeteria") {
      if (Platform.OS === "web") {
        return (
          <SafeAreaView style={styles.safe} edges={["top"]}>
            <View style={styles.detailContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={typography.caption}>Schnellzugriff</Text>
              <Text style={[typography.h1, { marginTop: 6 }]}>Mensaplan</Text>
              <Text style={[typography.body, { marginTop: 8 }]}>Dein Campus-Feed wird direkt geöffnet.</Text>
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Hochschule: {user?.campus ?? "deine Uni"}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpenLink(cafeteriaUrl)}>
                  <Text style={styles.primaryButtonText}>Mensaplan öffnen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      }

      const WebView = require("react-native-webview").default;
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.webContainer}>
            <View style={styles.webHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.webTitle}>Mensaplan · {user?.campus ?? "deine Uni"}</Text>
            </View>
            <WebView
              source={{ uri: cafeteriaUrl }}
              style={styles.webView}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        </SafeAreaView>
      );
    }

    if (activeQuickLink === "campus") {
      if (Platform.OS === "web") {
        return (
          <SafeAreaView style={styles.safe} edges={["top"]}>
            <View style={styles.detailContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={typography.caption}>Schnellzugriff</Text>
              <Text style={[typography.h1, { marginTop: 6 }]}>Campus-Portal</Text>
              <Text style={[typography.body, { marginTop: 8 }]}>Das Portal deiner Hochschule wird direkt geöffnet.</Text>
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Hochschule: {user?.campus ?? "deine Uni"}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpenLink(campusUrl)}>
                  <Text style={styles.primaryButtonText}>Campus-Portal öffnen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      }

      const WebView = require("react-native-webview").default;
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.webContainer}>
            <View style={styles.webHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.webTitle}>Campus-Portal · {user?.campus ?? "deine Uni"}</Text>
            </View>
            <WebView
              source={{ uri: campusUrl }}
              style={styles.webView}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        </SafeAreaView>
      );
    }

    if (activeQuickLink === "library") {
      if (Platform.OS === "web") {
        return (
          <SafeAreaView style={styles.safe} edges={["top"]}>
            <View style={styles.detailContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={typography.caption}>Schnellzugriff</Text>
              <Text style={[typography.h1, { marginTop: 6 }]}>Bibliothek</Text>
              <Text style={[typography.body, { marginTop: 8 }]}>Die Bibliothek deiner Hochschule wird direkt geöffnet.</Text>
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Hochschule: {user?.campus ?? "deine Uni"}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpenLink(libraryUrl)}>
                  <Text style={styles.primaryButtonText}>Bibliothek öffnen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      }

      const WebView = require("react-native-webview").default;
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.webContainer}>
            <View style={styles.webHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.webTitle}>Bibliothek · {user?.campus ?? "deine Uni"}</Text>
            </View>
            <WebView
              source={{ uri: libraryUrl }}
              style={styles.webView}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        </SafeAreaView>
      );
    }

    if (activeQuickLink === "moodle") {
      if (Platform.OS === "web") {
        return (
          <SafeAreaView style={styles.safe} edges={["top"]}>
            <View style={styles.detailContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={typography.caption}>Schnellzugriff</Text>
              <Text style={[typography.h1, { marginTop: 6 }]}>Moodle</Text>
              <Text style={[typography.body, { marginTop: 8 }]}>Deine Moodle-Seite der Hochschule wird direkt geöffnet.</Text>
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Hochschule: {user?.campus ?? "deine Uni"}</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpenLink(moodleUrl)}>
                  <Text style={styles.primaryButtonText}>Moodle öffnen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        );
      }

      const WebView = require("react-native-webview").default;
      return (
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <View style={styles.webContainer}>
            <View style={styles.webHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
                <Text style={styles.backButtonText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.webTitle}>Moodle · {user?.campus ?? "deine Uni"}</Text>
            </View>
            <WebView
              source={{ uri: moodleUrl }}
              style={styles.webView}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.detailContainer} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveQuickLink(null)}>
            <Text style={styles.backButtonText}>Zurück</Text>
          </TouchableOpacity>
          <Text style={typography.caption}>Schnellzugriff</Text>
          <Text style={[typography.h1, { marginTop: 6 }]}>{selectedQuickLink.title}</Text>
          <Text style={[typography.body, { marginTop: 8 }]}>{selectedQuickLink.body}</Text>

          {activeQuickLink === "grades" ? (
            <View style={styles.detailCard}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Kurs</Text>
                <TextInput
                  value={gradeForm.course}
                  onChangeText={(value) => setGradeForm((prev) => ({ ...prev, course: value }))}
                  style={styles.input}
                  placeholder="z. B. Mathematik"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Themengebiet</Text>
                <TextInput
                  value={gradeForm.topic}
                  onChangeText={(value) => setGradeForm((prev) => ({ ...prev, topic: value }))}
                  style={styles.input}
                  placeholder="z. B. Analysis"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Note</Text>
                <TextInput
                  value={gradeForm.grade}
                  onChangeText={(value) => setGradeForm((prev) => ({ ...prev, grade: value }))}
                  style={styles.input}
                  placeholder="z. B. 1,7"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Datum</Text>
                <TextInput
                  value={gradeForm.date}
                  onChangeText={(value) => setGradeForm((prev) => ({ ...prev, date: value }))}
                  style={styles.input}
                  placeholder="2026-08-24"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryButton} onPress={addGradeFromDashboard} disabled={isSavingDashboardGrade}>
                  <View style={styles.buttonContent}>
                    {isSavingDashboardGrade ? <ActivityIndicator size="small" color={colors.white} style={styles.loader} /> : null}
                    <Text style={styles.primaryButtonText}>{editingGradeId ? "Änderung speichern" : "Note speichern"}</Text>
                  </View>
                </TouchableOpacity>

                {editingGradeId ? (
                  <TouchableOpacity style={styles.secondaryButton} onPress={resetGradeForm}>
                    <Text style={styles.secondaryButtonText}>Abbrechen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {gradeEntries.length > 0 ? (
                <View style={styles.gradeListWrap}>
                  <Text style={styles.sectionTitle}>Deine Noten</Text>
                  <FlatList
                    data={gradeEntries.slice(0, 4)}
                    scrollEnabled={false}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.gradeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.gradeCourse}>{item.course}</Text>
                          <Text style={styles.gradeMeta}>{item.topic}</Text>
                        </View>
                        <View style={styles.gradeBadge}>
                          <Text style={styles.gradeBadgeText}>{item.grade}</Text>
                        </View>
                        <View style={styles.gradeActions}>
                          <TouchableOpacity style={styles.iconButton} onPress={() => startEditGrade(item)}>
                            <Ionicons name="pencil" size={16} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.iconButtonDanger} onPress={() => removeGrade(item.id)}>
                            <Ionicons name="trash" size={16} color={colors.white} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.detailCard}>
              {selectedQuickLink.items ? (
                <View style={styles.linkGrid}>
                  {selectedQuickLink.items.map((item) => (
                    <TouchableOpacity key={item.label} style={styles.linkCard} onPress={() => handleOpenLink(item.url)}>
                      <View style={styles.linkIconWrap}>
                        <Ionicons name={item.icon} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.linkLabel}>{item.label}</Text>
                      <Text style={styles.linkCaption}>{item.caption}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Modal visible={externalLinkWarningVisible} transparent animationType="fade" onRequestClose={() => setExternalLinkWarningVisible(false)}>
        <View style={styles.warningOverlay}>
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <Ionicons name="open-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.warningTitle}>Externe Seite öffnen?</Text>
            <Text style={styles.warningText}>Du wirst zu einer externen Seite weitergeleitet. StudFlow ist nicht für deren Inhalte verantwortlich.</Text>
            <TouchableOpacity style={styles.warningDismissRow} onPress={() => setDontShowExternalWarning((checked) => !checked)}>
              <View style={[styles.warningCheckbox, !dontShowExternalWarning && styles.warningCheckboxEmpty]}>
                {dontShowExternalWarning ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
              </View>
              <Text style={styles.warningDismissText}>Nicht mehr anzeigen</Text>
            </TouchableOpacity>
            <View style={styles.warningActions}>
              <TouchableOpacity style={styles.warningCancelButton} onPress={() => { setExternalLinkWarningVisible(false); setPendingExternalLink(null); }}>
                <Text style={styles.warningCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.warningContinueButton} onPress={continueToExternalLink}>
                <Text style={styles.warningContinueText}>Weiter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={typography.caption}>{greeting}</Text>
        <Text style={[typography.h1, styles.greeting]}>{user ? user.name : "Dein Campus-Start."}</Text>

        {tenantNews.length > 0 ? (
          <View style={styles.newsSection}>
            <SectionHeader title="News deiner Hochschule" subtitle="Aktuelle Informationen" />
            {tenantNews.slice(0, 3).map((news) => (
              <View key={news.id} style={styles.newsItem}>
                <Text style={styles.newsTitle}>{news.title}</Text>
                <Text style={styles.newsBody}>{news.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <SectionHeader title="Schnellzugriff" subtitle="Alles, was du täglich brauchst" />
        <View style={styles.grid}>
          {quickLinks.map((link) => (
            <QuickLinkTile key={link.id} link={link} onPress={() => handleQuickLinkPress(link.id)} />
          ))}
        </View>

        <SectionHeader title={`Heute ${todayName}`} subtitle={todayDateLabel} />
        <Card style={styles.scheduleCard}>
          {todaysSchedule.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Keine Kurse heute</Text>
              <Text style={styles.emptyText}>Für {todayName} sind noch keine Stunden hinterlegt.</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Stundenplan")} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Jetzt ergänzen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todaysSchedule.map((item, index) => (
              <View key={item.id} style={[styles.scheduleRow, index !== todaysSchedule.length - 1 && styles.scheduleRowBorder, item.completed && styles.scheduleRowCompleted]}>
                <View style={styles.timeCol}>
                  <Text style={[styles.timeText, item.completed && styles.scheduleTextCompleted]}>{item.time.split(" – ")[0]}</Text>
                </View>
                <View style={[styles.dot, item.completed && styles.dotCompleted]} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, item.completed && styles.scheduleTextCompleted]}>{item.course}</Text>
                  <Text style={[typography.caption, item.completed && styles.scheduleTextCompleted]}>{item.day} · {item.type} · {item.room}</Text>
                </View>
                <TouchableOpacity style={styles.dashboardCompletedToggle} onPress={() => toggleScheduleItemCompleted(item.id)} hitSlop={8}>
                  <View style={[styles.dashboardCheckbox, item.completed && styles.dashboardCheckboxActive]}>
                    {item.completed ? <Text style={styles.dashboardCheckmark}>✓</Text> : null}
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        <SectionHeader title="Aktive Freunde" subtitle={`${activeFriends.length} gerade online`} onlineIndicator />
        <Card style={styles.matchCard}>
          {activeFriends.length === 0 ? (
            <View style={styles.noActiveFriends}>
              <Ionicons name="people-outline" size={26} color={colors.white} />
              <Text style={[typography.body, styles.activeFriendsEmpty]}>Gerade ist keiner deiner Freunde online.</Text>
            </View>
          ) : (
            activeFriends.map((friend) => (
              <TouchableOpacity key={friend.id} style={styles.activeFriendRow} onPress={() => navigation.navigate("Match", { friendId: friend.id })} activeOpacity={0.75}>
                <View style={[styles.activeFriendAvatar, { backgroundColor: friend.avatarColor }]}>
                  <Text style={styles.activeFriendInitial}>{friend.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.activeFriendInfo}>
                  <Text style={[typography.bodyStrong, styles.activeFriendName]}>{friend.name}</Text>
                  <Text style={styles.activeFriendStatus}>Online</Text>
                </View>
                <View style={styles.onlineDot} />
              </TouchableOpacity>
            ))
          )}
        </Card>
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
  detailContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  webContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  webTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
    marginLeft: spacing.sm,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  backButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  detailCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  fieldBlock: {
    marginTop: spacing.sm,
  },
  label: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    includeFontPadding: false,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
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
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginRight: spacing.sm,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  gradeListWrap: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  gradeCourse: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  gradeMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  gradeBadge: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 54,
    alignItems: "center",
  },
  gradeBadgeText: {
    color: colors.primary,
    fontWeight: "800",
  },
  gradeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: spacing.sm,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonDanger: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E74C3C",
    alignItems: "center",
    justifyContent: "center",
  },
  linkGrid: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  linkCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  linkIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  linkLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: 4,
  },
  linkCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  greeting: {
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  newsSection: {
    marginBottom: spacing.lg,
  },
  newsItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  newsTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 15,
  },
  newsBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  scheduleCard: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: colors.white,
    fontWeight: "700",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dashboardCompletedToggle: {
    width: 32,
    height: 32,
    marginLeft: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardCheckboxActive: {
    backgroundColor: colors.textMuted,
    borderColor: colors.textMuted,
  },
  dashboardCheckmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  scheduleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleRowCompleted: {
    opacity: 0.58,
  },
  scheduleTextCompleted: {
    color: colors.textMuted,
  },
  timeCol: {
    width: 52,
    alignItems: "center",
  },
  timeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dotCompleted: {
    backgroundColor: colors.textMuted,
  },
  matchCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    marginBottom: spacing.lg,
  },
  warningOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,34,69,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  warningCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  warningTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  warningText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  warningDismissRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  warningCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  warningCheckboxEmpty: {
    backgroundColor: colors.surface,
  },
  warningDismissText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  warningActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  warningCancelButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  warningCancelText: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  warningContinueButton: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  warningContinueText: {
    color: colors.white,
    fontWeight: "800",
  },
  noActiveFriends: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  activeFriendsEmpty: {
    color: "#E4E1FF",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  activeFriendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  activeFriendAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFriendInitial: {
    color: colors.white,
    fontWeight: "800",
  },
  activeFriendInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  activeFriendName: {
    color: colors.white,
  },
  activeFriendStatus: {
    color: "#E4E1FF",
    fontSize: 12,
    marginTop: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
});

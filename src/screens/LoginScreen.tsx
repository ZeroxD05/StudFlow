import React, { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { loginUser, registerUser, useAppDb } from "@/data/db";
import { colors, radius, spacing, typography } from "@/theme/theme";

export default function LoginScreen() {
  const db = useAppDb();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("ata");
  const [password, setPassword] = useState("Atailayda05");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const [registerForm, setRegisterForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    major: "Informatik",
    semester: "4",
    campus: "Campus Nord",
    bio: "Frontend- und Lern-Apps mit Fokus auf UX.",
  });
  const normalizedRegisterUsername = registerForm.username.trim().toLowerCase();
  const usernameTaken = Boolean(normalizedRegisterUsername && db.users.some((user) => user.username.toLowerCase() === normalizedRegisterUsername));

  const triggerLoginError = () => {
    setLoginError(true);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      triggerLoginError();
      Alert.alert("Fehlende Angaben", "Bitte gib Benutzername und Passwort ein.");
      return;
    }

    try {
      await loginUser(username, password);
    } catch (error: any) {
      triggerLoginError();
      Alert.alert("Login fehlgeschlagen", error?.message ?? "Bitte prüfe deine Angaben.");
    }
  };

  const handleRegister = async () => {
    if (!registerForm.username.trim() || !registerForm.name.trim() || !registerForm.password) {
      Alert.alert("Fehlende Angaben", "Bitte fülle Benutzername, Anzeigename und Passwort aus.");
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(registerForm.username.trim())) {
      Alert.alert("Ungültiger Benutzername", "Der Benutzername darf nur Buchstaben und Zahlen enthalten.");
      return;
    }
    if (registerForm.password.length < 6) {
      Alert.alert("Passwort zu kurz", "Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    try {
      const createdUser = await registerUser({
        name: registerForm.name,
        username: registerForm.username,
        password: registerForm.password,
        major: registerForm.major,
        semester: Number(registerForm.semester) || 1,
        campus: registerForm.campus,
        bio: registerForm.bio,
      });
      setMode("login");
      setUsername(createdUser.username);
      setPassword(registerForm.password);
      Alert.alert("Registrierung erfolgreich", "Dein Profil wurde gespeichert.");
    } catch (error: any) {
      Alert.alert("Registrierung fehlgeschlagen", error?.message ?? "Bitte versuche es erneut.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>StudFlow</Text>
            <Text style={styles.subtitle}>Schlichtes Lernen. Klarer Überblick.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <TouchableOpacity
                style={[styles.switchButton, mode === "login" && styles.switchButtonActive]}
                onPress={() => setMode("login")}
              >
                <Text style={[styles.switchText, mode === "login" && styles.switchTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchButton, mode === "register" && styles.switchButtonActive]}
                onPress={() => setMode("register")}
              >
                <Text style={[styles.switchText, mode === "register" && styles.switchTextActive]}>Registrieren</Text>
              </TouchableOpacity>
            </View>

            {mode === "login" ? (
              <>
                <Text style={styles.label}>Benutzername</Text>
                <Animated.View style={{ transform: [{ translateX: shake }] }}>
                  <TextInput
                    value={username}
                    onChangeText={(value) => { setUsername(value); setLoginError(false); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="dein Benutzername"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.input, loginError && styles.inputError]}
                  />
                </Animated.View>
                {loginError ? <Text style={styles.errorText}>Kein Konto mit diesen Angaben gefunden.</Text> : null}

                <Text style={styles.label}>Passwort</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showLoginPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    style={styles.passwordInput}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowLoginPassword((visible) => !visible)} hitSlop={8}>
                    <Ionicons name={showLoginPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                  <Text style={styles.primaryButtonText}>Anmelden</Text>
                </TouchableOpacity>

              </>
            ) : (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={registerForm.name}
                  onChangeText={(value) => setRegisterForm((prev) => ({ ...prev, name: value }))}
                  placeholder="Dein Name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />

                <Text style={styles.label}>Benutzername</Text>
                <TextInput
                  value={registerForm.username}
                  onChangeText={(value) => setRegisterForm((prev) => ({ ...prev, username: value.replace(/[^a-zA-Z0-9]/g, "") }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="z.B. anna123"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, usernameTaken && styles.inputError]}
                />
                {usernameTaken ? <Text style={styles.errorText}>Dieser Benutzername ist bereits vergeben.</Text> : null}
                <Text style={styles.usernameHint}>Hinweis: Deinen Benutzernamen kannst du später nicht mehr ändern.</Text>
                <Text style={styles.inlineMail}>Deine App-Mail: {registerForm.username ? `${registerForm.username}@study2buddy.de` : "benutzername@study2buddy.de"}</Text>

                <Text style={styles.label}>Passwort</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    value={registerForm.password}
                    onChangeText={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
                    secureTextEntry={!showRegisterPassword}
                    placeholder="Mindestens 6 Zeichen"
                    placeholderTextColor={colors.textMuted}
                    style={styles.passwordInput}
                  />
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setShowRegisterPassword((visible) => !visible)} hitSlop={8}>
                    <Ionicons name={showRegisterPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>


                <TouchableOpacity style={[styles.primaryButton, usernameTaken && styles.disabledButton]} onPress={handleRegister} disabled={usernameTaken}>
                  <Text style={styles.primaryButtonText}>Profil erstellen</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  brand: {
    ...typography.h1,
    fontSize: 34,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  switchRow: {
    flexDirection: "row",
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: 5,
    marginBottom: spacing.lg,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: colors.primary,
  },
  switchText: {
    color: colors.textSecondary,
    fontWeight: "700",
  },
  switchTextActive: {
    color: colors.white,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  inlineMail: {
    color: colors.primary,
    fontWeight: "700",
    marginBottom: 8,
  },
  usernameHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
    fontSize: 16,
    includeFontPadding: false,
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingRight: 48,
    paddingVertical: 12,
    marginBottom: spacing.md,
    fontSize: 16,
    includeFontPadding: false,
  },
  eyeButton: {
    position: "absolute",
    right: spacing.sm,
    top: 0,
    height: 48,
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  inputError: {
    borderColor: "#C0392B",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 12,
    lineHeight: 17,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  bioInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.45,
  },
  demoText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    fontSize: 12,
  },
});

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "@/navigation/AppNavigator";
import LoginScreen from "@/screens/LoginScreen";
import { hydrateDb, useAppDb } from "@/data/db";
import { colors } from "@/theme/theme";

export default function App() {
  const [ready, setReady] = useState(false);
  const db = useAppDb();

  useEffect(() => {
    hydrateDb().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>StudFlow wird geladen ...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        {db.currentUserId ? <AppNavigator key={`app-${db.currentUserId}`} /> : <LoginScreen key="login" />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
});

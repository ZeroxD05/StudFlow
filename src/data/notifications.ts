import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let handlerConfigured = false;

export function configureNotificationHandler() {
  if (handlerConfigured) {
    return;
  }
  handlerConfigured = true;

  // Zeigt Benachrichtigungen auch dann an, wenn die App im Vordergrund geöffnet ist.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const getProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

export async function registerForPushToken(): Promise<string | null> {
  configureNotificationHandler();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Nachrichten",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Push-Tokens gibt es nur auf echten Geräten.
  if (!Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    console.warn("Mitteilungen wurden nicht erlaubt.");
    return null;
  }

  try {
    const projectId = getProjectId();
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return token.data;
  } catch (error) {
    console.warn("Expo-Push-Token konnte nicht geladen werden.", error);
    return null;
  }
}

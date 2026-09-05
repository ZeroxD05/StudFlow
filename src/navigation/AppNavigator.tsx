import React, { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "@/screens/DashboardScreen";
import MatchingScreen from "@/screens/MatchingScreen";
import ScheduleImportScreen from "@/screens/ScheduleImportScreen";
import GradesScreen from "@/screens/GradesScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { getUnreadDirectMessageCount, useAppDb } from "@/data/db";
import { colors } from "@/theme/theme";

const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();
const tabRoutes = ["Dashboard", "Match", "Stundenplan", "Community", "Profil"];

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.backgroundAlt,
    border: colors.border,
    primary: colors.primary,
    text: colors.textPrimary,
  },
};

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: "home",
  Match: "people",
  Stundenplan: "calendar",
  Community: "chatbubbles",
  Profil: "person",
};

export default function AppNavigator() {
  const { currentUserId, directMessages, users } = useAppDb();
  const currentUser = users.find((user) => user.id === currentUserId) ?? null;
  const [notification, setNotification] = useState<{ id: string; account: string; text: string } | null>(null);
  const previousMessageIds = useRef<Set<string> | null>(null);
  const previousUserId = useRef<string | null>(null);
  const notificationTranslateY = useRef(new Animated.Value(-140)).current;
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.8,
    onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 0.8,
    onPanResponderRelease: (_, gesture) => {
      if (!navigationRef.isReady() || Math.abs(gesture.dx) < 30) {
        return;
      }

      const currentRoute = navigationRef.getCurrentRoute()?.name;
      const currentIndex = currentRoute ? tabRoutes.indexOf(currentRoute) : -1;
      if (currentIndex < 0) {
        return;
      }

      const nextIndex = gesture.dx < 0 ? Math.min(currentIndex + 1, tabRoutes.length - 1) : Math.max(currentIndex - 1, 0);
      if (nextIndex !== currentIndex) {
        (navigationRef as any).navigate(tabRoutes[nextIndex]);
      }
    },
  })).current;
  const unreadMessages = currentUserId
    ? Object.entries(directMessages).reduce((total, [threadId, messages]) => total + getUnreadDirectMessageCount(messages, currentUserId, Boolean(currentUser?.notificationsMuted || currentUser?.mutedChatThreadIds?.includes(threadId))), 0)
    : 0;

  useEffect(() => {
    if (previousUserId.current !== currentUserId) {
      previousUserId.current = currentUserId;
      previousMessageIds.current = new Set(Object.values(directMessages).flat().map((message) => message.id));
      return;
    }

    const previousIds = previousMessageIds.current ?? new Set<string>();
    const incomingMessages = Object.entries(directMessages).flatMap(([threadId, messages]) => messages
      .filter((message) => {
        const isIncoming = message.senderId ? message.senderId !== currentUserId : message.sender !== "me";
        const isMuted = Boolean(currentUser?.notificationsMuted || currentUser?.mutedChatThreadIds?.includes(threadId));
        return currentUserId && isIncoming && !previousIds.has(message.id) && !isMuted;
      })
      .map((message) => ({ threadId, message })));

    previousMessageIds.current = new Set(Object.values(directMessages).flat().map((message) => message.id));
    const latest = incomingMessages[incomingMessages.length - 1];
    if (!latest) {
      return;
    }

    const sender = users.find((user) => user.id === latest.message.senderId);
    setNotification({
      id: latest.message.id,
      account: sender?.name ?? "Neue Nachricht",
      text: latest.message.text.length > 84 ? `${latest.message.text.slice(0, 84).trim()}...` : latest.message.text,
    });
    notificationTranslateY.stopAnimation();
    notificationTranslateY.setValue(-140);
    Animated.timing(notificationTranslateY, { toValue: 0, duration: 360, useNativeDriver: true }).start();
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }
    notificationTimer.current = setTimeout(() => {
      Animated.timing(notificationTranslateY, { toValue: -140, duration: 300, useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          setNotification(null);
        }
      });
    }, 3600);
  }, [currentUser, currentUserId, directMessages, users]);

  return (
    <View style={styles.appRoot}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarShowLabel: false,
          lazy: true,
          sceneContainerStyle: {
            flex: 1,
            backgroundColor: colors.background,
          },
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: colors.border,
            height: 76,
            paddingBottom: 10,
            paddingTop: 8,
            shadowColor: "#0F2A5D",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 6,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={(focused ? icons[route.name] : `${icons[route.name]}-outline`) as any}
              size={size - 2}
              color={color}
            />
          ),
          tabBarBadge: route.name === "Match" && unreadMessages > 0 ? (unreadMessages > 99 ? "99+" : unreadMessages) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#D92D3F",
            color: colors.white,
            fontSize: 11,
            fontWeight: "800",
            minWidth: 18,
            height: 18,
            lineHeight: 16,
            paddingBottom: 2,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Match" component={MatchingScreen} />
        <Tab.Screen name="Stundenplan" component={ScheduleImportScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
      </NavigationContainer>
      {notification ? (
        <Animated.View pointerEvents="none" style={[styles.notificationBanner, { transform: [{ translateY: notificationTranslateY }] }]}>
          <View style={styles.notificationDot} />
          <View style={styles.notificationContent}>
            <Text style={styles.notificationAccount} numberOfLines={1}>{notification.account}</Text>
            <Text style={styles.notificationText} numberOfLines={1}>{notification.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  notificationBanner: { position: "absolute", top: 58, left: 16, right: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 16, shadowColor: colors.primaryDark, shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  notificationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5B6E", marginRight: 10 },
  notificationContent: { flex: 1 },
  notificationAccount: { color: colors.white, fontSize: 12, fontWeight: "800" },
  notificationText: { color: "rgba(255,255,255,0.86)", fontSize: 13, marginTop: 2 },
});

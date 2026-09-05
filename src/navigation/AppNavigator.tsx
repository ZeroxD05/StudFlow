import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, TouchableOpacity, View } from "react-native";
import { createNavigationContainerRef, NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "@/screens/DashboardScreen";
import MatchingScreen from "@/screens/MatchingScreen";
import ScheduleImportScreen from "@/screens/ScheduleImportScreen";
import GradesScreen from "@/screens/GradesScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import ProfileScreen from "@/screens/ProfileScreen";
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
  Profil: "settings",
};

function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const indicatorPosition = useRef(new Animated.Value(state.index)).current;
  const tabWidth = barWidth / state.routes.length;

  useEffect(() => {
    Animated.timing(indicatorPosition, {
      toValue: state.index,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indicatorPosition, state.index]);

  return (
    <View style={styles.tabBar} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
      {barWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.tabIndicator, { width: tabWidth * 0.34, left: tabWidth * 0.33, transform: [{ translateX: Animated.multiply(indicatorPosition, tabWidth) }] }]}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.textMuted;
        const iconName = focused ? icons[route.name] : `${icons[route.name]}-outline`;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            style={styles.tabButton}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          >
            <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={24} color={color} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppNavigator() {
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
        })}
        tabBar={(props) => <AnimatedTabBar {...props} />}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Match" component={MatchingScreen} />
        <Tab.Screen name="Stundenplan" component={ScheduleImportScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  tabBar: { height: 76, flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, shadowColor: "#0F2A5D", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 6 },
  tabButton: { flex: 1, height: 58, alignItems: "center", justifyContent: "center", position: "relative" },
  tabIndicator: { position: "absolute", left: 0, bottom: 5, height: 4, borderRadius: 2, backgroundColor: colors.accent },
});

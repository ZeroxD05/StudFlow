import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "@/screens/DashboardScreen";
import MatchingScreen from "@/screens/MatchingScreen";
import ScheduleImportScreen from "@/screens/ScheduleImportScreen";
import GradesScreen from "@/screens/GradesScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { colors } from "@/theme/theme";

const Tab = createBottomTabNavigator();

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
  return (
    <NavigationContainer theme={navTheme}>
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
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
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
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Match" component={MatchingScreen} />
        <Tab.Screen name="Stundenplan" component={ScheduleImportScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

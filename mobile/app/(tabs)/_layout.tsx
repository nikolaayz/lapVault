import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(focused: boolean, name: IoniconName, outlineName: IoniconName) {
  return <Ionicons name={focused ? name : outlineName} size={24} color={focused ? C.red : C.muted} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.red,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => tabIcon(focused, "speedometer", "speedometer-outline"),
        }}
      />
      <Tabs.Screen
        name="laps"
        options={{
          title: "Laps",
          tabBarIcon: ({ focused }) => tabIcon(focused, "timer", "timer-outline"),
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: "Garage",
          tabBarIcon: ({ focused }) => tabIcon(focused, "car-sport", "car-sport-outline"),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => tabIcon(focused, "calendar", "calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ focused }) => tabIcon(focused, "trophy", "trophy-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => tabIcon(focused, "person", "person-outline"),
        }}
      />
    </Tabs>
  );
}
import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // Custom MobileBottomBar in AppShell controls parity
      }}
    >
      {/* 4 Web Canonical Tabs */}
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="tests" options={{ title: "Tests" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="pass" options={{ title: "Pass" }} />

      {/* Retained / Reparented Routes (Hidden from default tabbar to prevent loss of content) */}
      <Tabs.Screen name="practice" options={{ href: null, title: "Practice" }} />
      <Tabs.Screen name="learn" options={{ href: null, title: "Learn" }} />
      <Tabs.Screen name="library" options={{ href: null, title: "Library" }} />
      <Tabs.Screen name="profile" options={{ href: null, title: "Profile" }} />
    </Tabs>
  );
}

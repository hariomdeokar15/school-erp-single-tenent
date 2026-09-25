import React from "react";
import { Stack } from "expo-router";
import "../lib/i18n";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#4f46e5",
        },
        headerTintColor: "#ffffff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "SchoolERP India" }} />
    </Stack>
  );
}

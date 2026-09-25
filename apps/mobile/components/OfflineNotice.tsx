import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const OfflineNotice: React.FC<{ isOffline?: boolean }> = ({
  isOffline = false,
}) => {
  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Offline Mode Active — Local sync placeholder ready
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#b91c1c",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});

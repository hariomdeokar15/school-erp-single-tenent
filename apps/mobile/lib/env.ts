import Constants from "expo-constants";

export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    Constants.expoConfig?.extra?.apiBaseUrl ||
    "http://10.0.2.2:3000",
};

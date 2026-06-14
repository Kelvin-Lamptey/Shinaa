import { Platform } from "react-native";

// Central API URL configuration
// Android Emulator maps localhost to 10.0.2.2, while iOS/Web resolves localhost directly.
// If testing on physical devices, update this with your machine's local network IP.
export const API_URL = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://localhost:3000",
});

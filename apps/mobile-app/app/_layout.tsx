import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTintColor: "#1F2328",
        headerShadowVisible: true,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 16,
        },
        contentStyle: {
          backgroundColor: "#F6F8FA",
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Shinaa - Live Ledger" }} />
      <Stack.Screen name="login" options={{ title: "Caretaker Sign In" }} />
      <Stack.Screen name="caretaker" options={{ title: "Caretaker Ledger", headerLeft: () => null }} />
    </Stack>
  );
}

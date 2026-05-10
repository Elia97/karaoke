import { DarkTheme, ThemeProvider } from "@react-navigation/native"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import "react-native-reanimated"

import { KaraokeProvider } from "../components/karaoke-provider"

export default function RootLayout() {
  return (
    <KaraokeProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0b0b0b" },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="session/[code]" />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </KaraokeProvider>
  )
}

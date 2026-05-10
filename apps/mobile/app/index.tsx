import { useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { router } from "expo-router"
import {
  NicknameSchema,
  SessionCodeSchema,
} from "@workspace/protocol/handshake"

export default function JoinScreen() {
  const [code, setCode] = useState("")
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit() {
    setError(null)
    const codeResult = SessionCodeSchema.safeParse(code.trim().toUpperCase())
    if (!codeResult.success) {
      setError("Codice non valido (6 caratteri maiuscoli/cifre)")
      return
    }
    const nickResult = NicknameSchema.safeParse(nickname.trim())
    if (!nickResult.success) {
      setError("Nickname non valido (2-30 alfanumerici/underscore)")
      return
    }
    router.push({
      pathname: "/session/[code]",
      params: { code: codeResult.data, nickname: nickResult.data },
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🎤</Text>
        <Text style={styles.title}>Unisciti al karaoke</Text>
        <Text style={styles.subtitle}>
          Inserisci il codice della sessione e scegli un nickname.
        </Text>

        <Text style={styles.label}>Codice sessione</Text>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ABC123"
          placeholderTextColor="#555"
          style={[styles.input, styles.inputCode]}
        />

        <Text style={styles.label}>Nickname</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Marco_99"
          placeholderTextColor="#555"
          style={styles.input}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={onSubmit} style={styles.button}>
          <Text style={styles.buttonText}>Entra</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#1f1f1f",
    backgroundColor: "#121212",
    borderRadius: 24,
    padding: 28,
    gap: 12,
  },
  emoji: { fontSize: 56, textAlign: "center" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 12,
  },
  label: { fontSize: 14, color: "#ccc", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#0b0b0b",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  inputCode: {
    textAlign: "center",
    letterSpacing: 6,
    fontSize: 24,
    fontWeight: "700",
  },
  error: { color: "#f87171", fontSize: 14 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#0b0b0b", fontWeight: "700", fontSize: 16 },
})

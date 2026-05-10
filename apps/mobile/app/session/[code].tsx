import { useEffect, useState } from "react"
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import {
  useConnectionStatus,
  useCurrentSong,
  useLastError,
  usePrepareNotification,
  useQueue,
  useSession,
} from "@workspace/store/hooks"
import type { CatalogTrackDto } from "@workspace/protocol/domain"
import { useKaraoke } from "../../components/karaoke-provider"

export default function SessionScreen() {
  const params = useLocalSearchParams<{ code: string; nickname?: string }>()
  const { store, client } = useKaraoke()
  const session = useSession(store)
  const queue = useQueue(store)
  const currentSong = useCurrentSong(store)
  const status = useConnectionStatus(store)
  const lastError = useLastError(store)
  const prepare = usePrepareNotification(store)

  useEffect(() => {
    if (!params.code || !params.nickname) {
      router.replace("/")
      return
    }
    const participantToken = store.store.state.participantToken ?? undefined
    client.connect({
      code: params.code,
      nickname: params.nickname,
      participantToken,
    })
    return () => client.disconnect()
  }, [params.code, params.nickname, client, store])

  useEffect(() => {
    if (session?.status === "ENDED") {
      router.replace("/")
    }
  }, [session])

  const isMine = (nickname: string) => nickname === params.nickname

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{session?.name ?? "..."}</Text>
        <Text style={styles.headerSubtitle}>
          Codice {params.code} · {status} · {session?.status ?? "..."}
        </Text>
      </View>

      {prepare && isMine(prepare.item.singerNickname) && (
        <View style={styles.prepareBanner}>
          <Text style={styles.prepareTitle}>🎤 Tocca a te tra poco!</Text>
          <Text style={styles.prepareText}>{prepare.item.title}</Text>
        </View>
      )}

      {currentSong && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>STA CANTANDO</Text>
          <Text style={styles.cardTitle}>{currentSong.title}</Text>
          <Text style={styles.cardSubtitle}>
            {currentSong.artist ?? "—"} · {currentSong.singerNickname}
          </Text>
        </View>
      )}

      <RequestSongCard />

      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.cardTitleSm}>Coda ({queue.length})</Text>
        {queue.length === 0 ? (
          <Text style={styles.muted}>Coda vuota.</Text>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View style={styles.queueItem}>
                <Text style={styles.queueItemText}>
                  {item.position ? `#${item.position} ` : ""}
                  {item.title}
                </Text>
                <Text style={styles.muted}>
                  — {item.singerNickname} · {item.status}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {lastError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {lastError.code}: {lastError.message}
          </Text>
        </View>
      )}
    </View>
  )
}

function RequestSongCard() {
  const { client } = useKaraoke()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CatalogTrackDto[]>([])
  const [searching, setSearching] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  async function onSearch() {
    if (!query.trim()) return
    setSearching(true)
    setInfo(null)
    try {
      const ack = await client.searchTracks({ query, limit: 20 })
      if (ack.ok) setResults(ack.tracks)
      else setInfo(`Errore: ${ack.error}`)
    } finally {
      setSearching(false)
    }
  }

  async function onPick(track: CatalogTrackDto) {
    const ack = await client.requestSong({
      title: track.title,
      artist: track.artist,
      trackId: track.id,
      filename: track.filename,
      source: "catalog",
    })
    if (ack.ok) setInfo(`In coda: ${track.title}`)
    else setInfo(`Errore: ${ack.error}`)
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitleSm}>Richiedi un brano</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cerca titolo o artista"
          placeholderTextColor="#555"
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          onPress={onSearch}
          disabled={searching}
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>
            {searching ? "..." : "Cerca"}
          </Text>
        </Pressable>
      </View>
      {results.slice(0, 5).map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onPick(t)}
          style={styles.resultItem}
        >
          <Text style={styles.resultTitle}>{t.title}</Text>
          <Text style={styles.muted}>{t.artist}</Text>
        </Pressable>
      ))}
      {info && <Text style={styles.muted}>{info}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0b", padding: 16, gap: 12 },
  header: { gap: 4 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  headerSubtitle: { color: "#999", fontSize: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#1f1f1f",
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardLabel: { color: "#999", fontSize: 11, letterSpacing: 1.5 },
  cardTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  cardSubtitle: { color: "#bbb", fontSize: 14 },
  cardTitleSm: { color: "#fff", fontSize: 16, fontWeight: "700" },
  muted: { color: "#888", fontSize: 13 },
  prepareBanner: {
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: "#222",
    borderRadius: 16,
    padding: 14,
  },
  prepareTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  prepareText: { color: "#ccc", fontSize: 14, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#0b0b0b",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  searchButtonText: { color: "#0b0b0b", fontWeight: "700" },
  resultItem: {
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    padding: 10,
  },
  resultTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  queueItem: {
    borderWidth: 1,
    borderColor: "#262626",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  queueItemText: { color: "#fff", fontSize: 14 },
  errorBox: {
    borderWidth: 1,
    borderColor: "#7f1d1d",
    backgroundColor: "#1f0a0a",
    borderRadius: 10,
    padding: 10,
  },
  errorText: { color: "#fca5a5", fontSize: 13 },
})

import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { C } from "@/constants/colors";
import { CAR_CLASSES } from "@/lib/types";
import { formatMs, formatDate } from "@/lib/formatters";
import { PickerModal } from "@/components/PickerModal";
import type { CarClass } from "@/lib/types";

interface Track { id: number; name: string; country: string; }

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  lapTimeMs: number;
  carMake: string;
  carModel: string;
  carYear: number;
  carClass: string;
  conditions: string;
  createdAt: string;
  isCurrentUser: boolean;
}

const medals = ["🥇", "🥈", "🥉"];

const conditionColor: Record<string, string> = {
  dry: "#34D399",
  wet: "#60A5FA",
  damp: "#FBBF24",
};

export default function LeaderboardScreen() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedClass, setSelectedClass] = useState<CarClass | "">("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackPickerVisible, setTrackPickerVisible] = useState(false);

  const loadTracks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/tracks");
      if (res.status === 401) { router.replace("/login"); return; }
      const data: Track[] = await res.json();
      setTracks(data);
      if (data.length > 0 && !selectedTrack) setSelectedTrack(data[0]);
    } catch {}
  }, []);

  const loadLeaderboard = useCallback(async (track: Track | null, cls: CarClass | "", isRefresh = false) => {
    if (!track) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ trackId: track.id.toString() });
      if (cls) params.set("class", cls);
      const res = await apiFetch(`/api/leaderboard?${params}`);
      if (res.status === 401) { router.replace("/login"); return; }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void (async () => {
      await loadTracks();
    })();
  }, [loadTracks]));

  useFocusEffect(useCallback(() => {
    if (selectedTrack) void loadLeaderboard(selectedTrack, selectedClass);
  }, [selectedTrack, selectedClass]));

  function selectTrack(id: string) {
    const track = tracks.find((t) => t.id.toString() === id) ?? null;
    setSelectedTrack(track);
    setTrackPickerVisible(false);
  }

  function selectClass(cls: CarClass | "") {
    setSelectedClass(cls);
  }

  if (loading && entries.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator style={s.loader} color={C.red} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadLeaderboard(selectedTrack, selectedClass, true)} tintColor={C.red} />
        }
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>Track Records</Text>
          <Text style={s.title}>Leaderboard</Text>
        </View>

        {tracks.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏆</Text>
            <Text style={s.emptyTitle}>No tracks yet</Text>
            <Text style={s.emptySubtext}>Tracks will appear here once added.</Text>
          </View>
        ) : (
          <>
            {/* Track picker */}
            <Pressable style={({ pressed }) => [s.trackBtn, pressed && s.pressed]} onPress={() => setTrackPickerVisible(true)}>
              <View style={s.trackBtnInner}>
                <Text style={s.trackBtnLabel}>Track</Text>
                <Text style={s.trackBtnValue} numberOfLines={1}>
                  {selectedTrack ? `${selectedTrack.name} — ${selectedTrack.country}` : "Select a track…"}
                </Text>
              </View>
              <Text style={s.trackBtnChevron}>›</Text>
            </Pressable>

            {/* Class filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.classPills}>
              <Pressable
                style={[s.pill, selectedClass === "" && s.pillActive]}
                onPress={() => selectClass("")}
              >
                <Text style={[s.pillText, selectedClass === "" && s.pillTextActive]}>All</Text>
              </Pressable>
              {CAR_CLASSES.map((cls) => (
                <Pressable
                  key={cls}
                  style={[s.pill, selectedClass === cls && s.pillActive]}
                  onPress={() => selectClass(cls)}
                >
                  <Text style={[s.pillText, selectedClass === cls && s.pillTextActive]}>{cls}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Entries */}
            {loading ? (
              <ActivityIndicator style={s.inlineLoader} color={C.red} />
            ) : entries.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>⏱</Text>
                <Text style={s.emptyTitle}>No laps recorded</Text>
                <Text style={s.emptySubtext}>Be the first to set a time on this track.</Text>
              </View>
            ) : (
              <View style={s.list}>
                {/* Header row */}
                <View style={s.headerRow}>
                  <Text style={[s.col, s.colRank, s.headerText]}>#</Text>
                  <Text style={[s.colFlex, s.headerText]}>Driver</Text>
                  <Text style={[s.col, s.colTime, s.headerText]}>Time</Text>
                </View>
                {entries.map((entry) => (
                  <View
                    key={`${entry.userId}-${entry.carClass}`}
                    style={[s.row, entry.isCurrentUser && s.rowHighlight]}
                  >
                    <Text style={[s.col, s.colRank, s.rankText]}>
                      {entry.rank <= 3 ? medals[entry.rank - 1] : entry.rank}
                    </Text>
                    <View style={s.colFlex}>
                      <Text style={[s.driverName, entry.isCurrentUser && s.driverNameYou]} numberOfLines={1}>
                        {entry.userName}{entry.isCurrentUser ? " (you)" : ""}
                      </Text>
                      <Text style={s.carInfo} numberOfLines={1}>
                        {entry.carYear} {entry.carMake} {entry.carModel} · {entry.carClass}
                      </Text>
                      <View style={s.meta}>
                        <View style={[s.condDot, { backgroundColor: conditionColor[entry.conditions] ?? C.muted }]} />
                        <Text style={s.metaText}>{entry.conditions} · {formatDate(entry.createdAt)}</Text>
                      </View>
                    </View>
                    <Text style={[s.col, s.colTime, s.timeText, entry.isCurrentUser && s.timeTextYou]}>
                      {formatMs(entry.lapTimeMs)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <PickerModal
        visible={trackPickerVisible}
        title="Select Track"
        items={tracks.map((t) => ({ id: t.id.toString(), label: t.name, sub: t.country }))}
        selectedId={selectedTrack?.id.toString() ?? ""}
        onSelect={selectTrack}
        onClose={() => setTrackPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },
  loader: { flex: 1 },
  inlineLoader: { marginTop: 48 },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.red, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", color: C.offWhite },

  trackBtn: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: C.border },
  trackBtnInner: { flex: 1 },
  trackBtnLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 2 },
  trackBtnValue: { fontSize: 14, fontWeight: "600", color: C.offWhite },
  trackBtnChevron: { fontSize: 20, color: C.muted, marginLeft: 8 },
  pressed: { opacity: 0.75 },

  classPills: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  pillActive: { borderColor: C.red, backgroundColor: "rgba(230,59,25,0.12)" },
  pillText: { fontSize: 12, fontWeight: "600", color: C.muted },
  pillTextActive: { color: C.red },

  list: { marginHorizontal: 20, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 10 },
  headerText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, borderLeftWidth: 3, borderLeftColor: "transparent" },
  rowHighlight: { borderLeftColor: C.red },

  col: { flexShrink: 0 },
  colFlex: { flex: 1, marginRight: 8 },
  colRank: { width: 32 },
  colTime: { width: 72, alignItems: "flex-end" },

  rankText: { fontSize: 13, color: C.muted, fontVariant: ["tabular-nums"] },
  driverName: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  driverNameYou: { color: C.red },
  carInfo: { fontSize: 11, color: C.muted, marginTop: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  condDot: { width: 6, height: 6, borderRadius: 3 },
  metaText: { fontSize: 10, color: C.muted },
  timeText: { fontSize: 14, fontWeight: "bold", color: C.offWhite, fontVariant: ["tabular-nums"], textAlign: "right" },
  timeTextYou: { color: C.red },

  empty: { alignItems: "center", paddingTop: 64, gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: C.offWhite },
  emptySubtext: { fontSize: 13, color: C.muted },
});

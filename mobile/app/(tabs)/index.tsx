import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";

type Lap = {
  id: number;
  lapTimeMs: number;
  conditions: string;
  createdAt: string;
  trackName: string;
  carMake: string;
  carModel: string;
  carYear: number;
};

type Event = {
  id: number;
  title: string;
  date: string;
  trackName: string;
};

type DashboardData = {
  userName: string;
  totalLaps: number;
  trackName: string | null;
  bestLapFormatted: string | null;
  possibleBestFormatted: string | null;
  recentLaps: Lap[];
  upcomingEvents: Event[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/dashboard");
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError("Could not load dashboard. Pull to refresh.");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Could not load dashboard. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) {
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={C.red}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Dashboard</Text>
          <Text style={s.greeting}>Welcome back,</Text>
          <Text style={s.greetingName}>{data?.userName ?? "Driver"}</Text>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={[s.statCard, s.statRed]}>
            <Text style={s.statLabel}>Total Laps</Text>
            <Text style={s.statValue}>
              {(data?.totalLaps ?? 0) > 0 ? data!.totalLaps : "—"}
            </Text>
          </View>
          <View style={[s.statCard, s.statRed]}>
            <Text style={s.statLabel}>Best Lap</Text>
            <Text style={s.statValue}>{data?.bestLapFormatted ?? "—"}</Text>
            {data?.trackName ? (
              <Text style={s.statSubtext} numberOfLines={1}>{data.trackName}</Text>
            ) : null}
          </View>
          <View style={[s.statCard, s.statBlue]}>
            <Text style={s.statLabel}>Possible Best</Text>
            <Text style={s.statValue}>{data?.possibleBestFormatted ?? "—"}</Text>
            {!data?.possibleBestFormatted && (data?.totalLaps ?? 0) > 0 ? (
              <Text style={s.statSubtext}>Log 3 sectors</Text>
            ) : null}
          </View>
        </View>

        {/* Recent Laps */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardLabel}>Recent Laps</Text>
            {(data?.totalLaps ?? 0) > 0 && (
              <Pressable onPress={() => router.push("/(tabs)/laps")}>
                <Text style={s.viewAll}>View all →</Text>
              </Pressable>
            )}
          </View>

          {!data?.recentLaps.length ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>⏱</Text>
              <Text style={s.emptyTitle}>No laps logged yet</Text>
              <Text style={s.emptySubtext}>Head to the track and log your first lap.</Text>
            </View>
          ) : (
            data.recentLaps.map((lap, i) => (
              <View key={lap.id} style={[s.lapRow, i > 0 && s.lapDivider]}>
                <View style={s.lapInfo}>
                  <Text style={s.lapTrack} numberOfLines={1}>{lap.trackName}</Text>
                  <Text style={s.lapMeta}>
                    {lap.carYear} {lap.carMake} {lap.carModel} · {formatDate(lap.createdAt)}
                  </Text>
                </View>
                <Text style={s.lapTime}>{formatMs(lap.lapTimeMs)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Upcoming Events */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardLabel}>Upcoming Events</Text>
            <Pressable onPress={() => router.push("/(tabs)/events")}>
              <Text style={s.viewAll}>View all →</Text>
            </Pressable>
          </View>

          {!data?.upcomingEvents.length ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyTitle}>No upcoming events</Text>
              <Pressable onPress={() => router.push("/(tabs)/events")}>
                <Text style={s.emptyLink}>Browse events →</Text>
              </Pressable>
            </View>
          ) : (
            data.upcomingEvents.map((event, i) => (
              <View key={event.id} style={[s.lapRow, i > 0 && s.lapDivider]}>
                <View style={s.lapInfo}>
                  <Text style={s.lapTrack} numberOfLines={1}>{event.title}</Text>
                  <Text style={s.lapMeta}>
                    {event.trackName} · {formatDate(event.date)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3);
  return m > 0 ? `${m}:${sec.padStart(6, "0")}` : sec;
}

const C = {
  bg: "#0A0A0F",
  surface: "#12121A",
  card: "#1C1C2E",
  red: "#E63B19",
  blue: "#3B82F6",
  offWhite: "#F0F0F5",
  muted: "#6B6B80",
  border: "#2A2A3A",
  errorBg: "rgba(230,59,25,0.1)",
  errorBorder: "rgba(230,59,25,0.25)",
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },
  loader: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
    marginBottom: 6,
  },
  greeting: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "bold",
    color: C.offWhite,
  },

  errorBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { fontSize: 13, color: "#FF6B4A" },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
  },
  statRed: { borderLeftColor: C.red },
  statBlue: { borderLeftColor: C.blue },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: C.offWhite,
    fontVariant: ["tabular-nums"],
  },
  statSubtext: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },

  // Cards
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  viewAll: {
    fontSize: 12,
    color: C.red,
    fontWeight: "600",
  },

  // Lap rows
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  lapDivider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  lapInfo: { flex: 1, marginRight: 12 },
  lapTrack: {
    fontSize: 14,
    fontWeight: "600",
    color: C.offWhite,
  },
  lapMeta: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  lapTime: {
    fontSize: 14,
    fontWeight: "bold",
    color: C.offWhite,
    fontVariant: ["tabular-nums"],
  },

  // Empty states
  empty: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyTitle: { fontSize: 14, color: C.muted },
  emptySubtext: { fontSize: 12, color: C.muted, marginTop: 4 },
  emptyLink: { fontSize: 12, color: C.red, marginTop: 6, fontWeight: "600" },
});
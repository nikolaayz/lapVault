import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { C } from "@/constants/colors";
import { formatMs } from "@/lib/formatters";
import { emptyLapForm, lapToForm, buildGroups, parseTimeToMs, type Lap, type LapCar, type Track, type LapFormState } from "@/lib/lapUtils";
import { TrackGroup } from "@/components/laps/TrackGroup";
import { LapModal } from "@/components/laps/LapModal";

export default function LapsScreen() {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [cars, setCars] = useState<LapCar[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingLap, setEditingLap] = useState<Lap | null>(null);
  const [form, setForm] = useState<LapFormState>(emptyLapForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [lapsRes, carsRes, tracksRes] = await Promise.all([
        apiFetch("/api/laps"),
        apiFetch("/api/cars"),
        apiFetch("/api/tracks"),
      ]);
      if (lapsRes.status === 401) { router.replace("/login"); return; }
      const [lapsData, carsData, tracksData] = await Promise.all([
        lapsRes.json(), carsRes.json(), tracksRes.json(),
      ]);
      setLaps(lapsData);
      setCars(carsData);
      setTracks(tracksData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const groups = buildGroups(laps);

  function openAdd() {
    setForm(emptyLapForm);
    setFormError("");
    setModalMode("add");
    setEditingLap(null);
    setModalVisible(true);
  }

  function openEdit(lap: Lap) {
    setForm(lapToForm(lap));
    setFormError("");
    setModalMode("edit");
    setEditingLap(lap);
    setModalVisible(true);
  }

  function set<K extends keyof LapFormState>(key: K, value: LapFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const lapTimeMs = parseTimeToMs(form.lapTime);
    if (!form.trackId || !form.carId) { setFormError("Track and car are required."); return; }
    if (lapTimeMs === null) { setFormError("Invalid lap time — use M:SS.mmm or SS.mmm."); return; }

    const s1 = form.sector1 ? parseTimeToMs(form.sector1) : null;
    const s2 = form.sector2 ? parseTimeToMs(form.sector2) : null;
    const s3 = form.sector3 ? parseTimeToMs(form.sector3) : null;
    if (form.sector1 && s1 === null) { setFormError("Invalid sector 1 time."); return; }
    if (form.sector2 && s2 === null) { setFormError("Invalid sector 2 time."); return; }
    if (form.sector3 && s3 === null) { setFormError("Invalid sector 3 time."); return; }

    const payload = {
      carId: parseInt(form.carId),
      trackId: parseInt(form.trackId),
      lapTimeMs,
      sector1Ms: s1,
      sector2Ms: s2,
      sector3Ms: s3,
      conditions: form.conditions,
      notes: form.notes || null,
    };

    setSaving(true);
    setFormError("");
    try {
      let res: Response;
      if (modalMode === "add") {
        res = await apiFetch("/api/laps", { method: "POST", body: JSON.stringify(payload) });
      } else {
        res = await apiFetch(`/api/laps/${editingLap!.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to save lap."); return; }

      const car = cars.find((c) => c.id === payload.carId)!;
      const track = tracks.find((t) => t.id === payload.trackId)!;

      if (modalMode === "add") {
        setLaps((prev) => [{ id: data.id, ...payload, createdAt: data.createdAt, car, track }, ...prev]);
      } else {
        setLaps((prev) => prev.map((l) => l.id === editingLap!.id ? { ...l, ...payload, car, track } : l));
      }
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(lap: Lap) {
    Alert.alert(
      "Delete Lap",
      `Remove this lap at ${lap.track.name} (${formatMs(lap.lapTimeMs)})?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteLap(lap.id) },
      ]
    );
  }

  async function deleteLap(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/laps/${id}`, { method: "DELETE" });
      setLaps((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.red} />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Lap Times</Text>
            <Text style={s.title}>My Laps</Text>
          </View>
          {cars.length > 0 && (
            <Pressable style={({ pressed }) => [s.addBtn, pressed && s.pressed]} onPress={openAdd}>
              <Ionicons name="add" size={18} color={C.offWhite} />
              <Text style={s.addBtnText}>Log Lap</Text>
            </Pressable>
          )}
        </View>

        {cars.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏎</Text>
            <Text style={s.emptyTitle}>No cars in your garage</Text>
            <Text style={s.emptySubtext}>Add a car before logging laps.</Text>
            <Pressable style={({ pressed }) => [s.addBtn, pressed && s.pressed]} onPress={() => router.push("/(tabs)/garage")}>
              <Text style={s.addBtnText}>Go to Garage →</Text>
            </Pressable>
          </View>
        )}

        {cars.length > 0 && groups.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⏱</Text>
            <Text style={s.emptyTitle}>No laps logged yet</Text>
            <Text style={s.emptySubtext}>Hit the track and log your first lap.</Text>
          </View>
        )}

        {groups.map((group) => (
          <TrackGroup
            key={group.track.id}
            group={group}
            onEdit={openEdit}
            onDelete={confirmDelete}
            deletingId={deletingId}
          />
        ))}
      </ScrollView>

      <LapModal
        visible={modalVisible}
        mode={modalMode}
        form={form}
        cars={cars}
        tracks={tracks}
        saving={saving}
        error={formError}
        onSet={set}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 32 },
  loader: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.red, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", color: C.offWhite },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: "700", color: C.offWhite },
  pressed: { opacity: 0.75 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: C.offWhite },
  emptySubtext: { fontSize: 13, color: C.muted, marginBottom: 12 },
});

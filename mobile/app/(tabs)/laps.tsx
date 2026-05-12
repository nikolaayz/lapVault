import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type Conditions = "dry" | "wet" | "damp";
type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

interface Track { id: number; name: string; country: string; lengthKm: string | null; }
interface LapCar { id: number; make: string; model: string; year: number; class: CarClass; }
interface Lap {
  id: number;
  lapTimeMs: number;
  sector1Ms: number | null;
  sector2Ms: number | null;
  sector3Ms: number | null;
  conditions: Conditions;
  notes: string | null;
  createdAt: string;
  car: LapCar;
  track: Track;
}
interface LapGroup {
  track: Track;
  laps: Lap[];
  bestMs: number;
  possibleBestMs: number | null;
  latestAt: string;
}
interface FormState {
  trackId: string;
  carId: string;
  lapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
  conditions: Conditions;
  notes: string;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function parseTimeToMs(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx === -1) {
    const s = parseFloat(trimmed);
    return isNaN(s) || s < 0 ? null : Math.round(s * 1000);
  }
  const m = parseInt(trimmed.slice(0, colonIdx));
  const s = parseFloat(trimmed.slice(colonIdx + 1));
  if (isNaN(m) || isNaN(s) || m < 0 || s < 0) return null;
  return m * 60_000 + Math.round(s * 1000);
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const sec = ((ms % 60_000) / 1000).toFixed(3);
  return m > 0 ? `${m}:${sec.padStart(6, "0")}` : sec;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function buildGroups(lapList: Lap[]): LapGroup[] {
  const map = new Map<number, LapGroup>();
  for (const lap of lapList) {
    const g = map.get(lap.track.id);
    if (!g) {
      map.set(lap.track.id, { track: lap.track, laps: [lap], bestMs: lap.lapTimeMs, possibleBestMs: null, latestAt: lap.createdAt });
    } else {
      g.laps.push(lap);
      if (lap.lapTimeMs < g.bestMs) g.bestMs = lap.lapTimeMs;
      if (lap.createdAt > g.latestAt) g.latestAt = lap.createdAt;
    }
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.laps.sort((a, b) => a.lapTimeMs - b.lapTimeMs);
    const complete = g.laps.filter((l) => l.sector1Ms != null && l.sector2Ms != null && l.sector3Ms != null);
    if (complete.length > 0) {
      g.possibleBestMs =
        Math.min(...complete.map((l) => l.sector1Ms!)) +
        Math.min(...complete.map((l) => l.sector2Ms!)) +
        Math.min(...complete.map((l) => l.sector3Ms!));
    }
  }
  groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  return groups;
}

const emptyForm: FormState = {
  trackId: "", carId: "", lapTime: "", sector1: "", sector2: "", sector3: "", conditions: "dry", notes: "",
};

function lapToForm(lap: Lap): FormState {
  return {
    trackId: lap.track.id.toString(),
    carId: lap.car.id.toString(),
    lapTime: formatMs(lap.lapTimeMs),
    sector1: lap.sector1Ms != null ? formatMs(lap.sector1Ms) : "",
    sector2: lap.sector2Ms != null ? formatMs(lap.sector2Ms) : "",
    sector3: lap.sector3Ms != null ? formatMs(lap.sector3Ms) : "",
    conditions: lap.conditions,
    notes: lap.notes ?? "",
  };
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function LapsScreen() {
  const [laps, setLaps] = useState<Lap[]>([]);
  const [cars, setCars] = useState<LapCar[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingLap, setEditingLap] = useState<Lap | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
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
    setForm(emptyForm);
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
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
        {/* Header */}
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

        {/* No cars state */}
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

        {/* No laps state */}
        {cars.length > 0 && groups.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⏱</Text>
            <Text style={s.emptyTitle}>No laps logged yet</Text>
            <Text style={s.emptySubtext}>Hit the track and log your first lap.</Text>
          </View>
        )}

        {/* Track groups */}
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

// ── Track group ────────────────────────────────────────────────────────────────

function TrackGroup({
  group, onEdit, onDelete, deletingId,
}: {
  group: LapGroup;
  onEdit: (lap: Lap) => void;
  onDelete: (lap: Lap) => void;
  deletingId: number | null;
}) {
  return (
    <View style={g.wrap}>
      {/* Group header */}
      <View style={g.header}>
        <View style={g.headerLeft}>
          <Text style={g.trackName} numberOfLines={1}>{group.track.name}</Text>
          <Text style={g.trackMeta}>
            {group.track.country}{group.track.lengthKm ? ` · ${group.track.lengthKm} km` : ""}
            {" · "}{group.laps.length} {group.laps.length === 1 ? "lap" : "laps"}
          </Text>
        </View>
        <View style={g.stats}>
          <View style={g.stat}>
            <Text style={g.statLabel}>Best</Text>
            <Text style={g.statBest}>{formatMs(group.bestMs)}</Text>
          </View>
          {group.possibleBestMs != null && (
            <View style={g.stat}>
              <Text style={g.statLabel}>Poss. Best</Text>
              <Text style={g.statPoss}>{formatMs(group.possibleBestMs)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Lap rows */}
      {group.laps.map((lap, i) => (
        <LapRow
          key={lap.id}
          lap={lap}
          isBest={lap.lapTimeMs === group.bestMs}
          isLast={i === group.laps.length - 1}
          onEdit={() => onEdit(lap)}
          onDelete={() => onDelete(lap)}
          deleting={deletingId === lap.id}
        />
      ))}
    </View>
  );
}

// ── Lap row ────────────────────────────────────────────────────────────────────

const conditionColor: Record<Conditions, string> = {
  dry: "#34D399",
  wet: "#60A5FA",
  damp: "#FBBF24",
};
const conditionBg: Record<Conditions, string> = {
  dry: "rgba(52,211,153,0.12)",
  wet: "rgba(96,165,250,0.12)",
  damp: "rgba(251,191,36,0.12)",
};

function LapRow({ lap, isBest, isLast, onEdit, onDelete, deleting }: {
  lap: Lap;
  isBest: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <View style={[r.row, isBest && r.rowBest, !isLast && r.rowDivider]}>
      <View style={r.left}>
        <Text style={[r.time, isBest && r.timeBest]}>{formatMs(lap.lapTimeMs)}</Text>
        <Text style={r.car} numberOfLines={1}>
          {lap.car.year} {lap.car.make} {lap.car.model}
        </Text>
        <View style={r.meta}>
          <View style={[r.condBadge, { backgroundColor: conditionBg[lap.conditions] }]}>
            <Text style={[r.condText, { color: conditionColor[lap.conditions] }]}>
              {lap.conditions}
            </Text>
          </View>
          <Text style={r.date}>{formatDate(lap.createdAt)}</Text>
        </View>
        {(lap.sector1Ms != null || lap.sector2Ms != null || lap.sector3Ms != null) && (
          <View style={r.sectors}>
            {[lap.sector1Ms, lap.sector2Ms, lap.sector3Ms].map((s, i) => (
              <View key={i} style={r.sector}>
                <Text style={r.sectorLabel}>S{i + 1}</Text>
                <Text style={r.sectorVal}>{s != null ? formatMs(s) : "—"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={r.actions}>
        <Pressable style={({ pressed }) => [r.iconBtn, pressed && r.iconPressed]} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={15} color={C.muted} />
        </Pressable>
        <Pressable style={({ pressed }) => [r.iconBtn, pressed && r.iconPressed]} onPress={onDelete} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size="small" color={C.muted} />
            : <Ionicons name="trash-outline" size={15} color={C.muted} />
          }
        </Pressable>
      </View>
    </View>
  );
}

// ── Lap modal (bottom sheet) ───────────────────────────────────────────────────

function LapModal({ visible, mode, form, cars, tracks, saving, error, onSet, onSave, onClose }: {
  visible: boolean;
  mode: "add" | "edit";
  form: FormState;
  cars: LapCar[];
  tracks: Track[];
  saving: boolean;
  error: string;
  onSet: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [trackPickerVisible, setTrackPickerVisible] = useState(false);
  const [carPickerVisible, setCarPickerVisible] = useState(false);

  const s1Ref = useRef<TextInputType>(null);
  const s2Ref = useRef<TextInputType>(null);
  const s3Ref = useRef<TextInputType>(null);

  const selectedTrack = tracks.find((t) => t.id.toString() === form.trackId);
  const selectedCar = cars.find((c) => c.id.toString() === form.carId);
  const canSave = !!(form.trackId && form.carId && form.lapTime.trim() && !saving);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={m.title}>{mode === "add" ? "Log Lap" : "Edit Lap"}</Text>

            {/* Track picker */}
            <Text style={m.label}>Track <Text style={m.required}>*</Text></Text>
            <Pressable style={({ pressed }) => [m.picker, pressed && m.pickerPressed]} onPress={() => setTrackPickerVisible(true)}>
              <Text style={selectedTrack ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
                {selectedTrack ? `${selectedTrack.name} — ${selectedTrack.country}` : "Select a track…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </Pressable>

            {/* Car picker */}
            <Text style={m.label}>Car <Text style={m.required}>*</Text></Text>
            <Pressable style={({ pressed }) => [m.picker, pressed && m.pickerPressed]} onPress={() => setCarPickerVisible(true)}>
              <Text style={selectedCar ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
                {selectedCar ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}` : "Select a car…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </Pressable>

            {/* Lap time + Conditions */}
            <View style={m.row}>
              <View style={m.flex1}>
                <Text style={m.label}>Lap Time <Text style={m.required}>*</Text></Text>
                <TextInput
                  style={m.input}
                  placeholder="1:23.456"
                  placeholderTextColor={C.muted}
                  value={form.lapTime}
                  onChangeText={(v) => onSet("lapTime", v)}
                  keyboardType="default"
                  returnKeyType="next"
                  onSubmitEditing={() => s1Ref.current?.focus()}
                />
              </View>
              <View style={m.flex1}>
                <Text style={m.label}>Conditions <Text style={m.required}>*</Text></Text>
                <View style={m.condRow}>
                  {(["dry", "wet", "damp"] as Conditions[]).map((c) => (
                    <Pressable
                      key={c}
                      style={[m.condPill, form.conditions === c && { borderColor: conditionColor[c], backgroundColor: conditionBg[c] }]}
                      onPress={() => onSet("conditions", c)}
                    >
                      <Text style={[m.condPillText, form.conditions === c && { color: conditionColor[c] }]}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Sectors */}
            <Text style={m.sectionLabel}>Sector Times <Text style={m.optional}>(optional)</Text></Text>
            <View style={m.row}>
              {([
                { label: "S1", key: "sector1" as const, ref: s1Ref, next: s2Ref, placeholder: "28.123" },
                { label: "S2", key: "sector2" as const, ref: s2Ref, next: s3Ref, placeholder: "32.456" },
                { label: "S3", key: "sector3" as const, ref: s3Ref, next: null, placeholder: "22.877" },
              ]).map(({ label, key, ref, next, placeholder }) => (
                <View key={key} style={m.flex1}>
                  <Text style={m.label}>{label}</Text>
                  <TextInput
                    ref={ref}
                    style={m.input}
                    placeholder={placeholder}
                    placeholderTextColor={C.muted}
                    value={form[key]}
                    onChangeText={(v) => onSet(key, v)}
                    keyboardType="default"
                    returnKeyType={next ? "next" : "done"}
                    onSubmitEditing={() => next?.current?.focus()}
                  />
                </View>
              ))}
            </View>

            {/* Notes */}
            <Text style={m.label}>Notes</Text>
            <TextInput
              style={[m.input, m.textarea]}
              placeholder="Setup changes, track conditions, remarks..."
              placeholderTextColor={C.muted}
              value={form.notes}
              onChangeText={(v) => onSet("notes", v)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {error ? (
              <View style={m.errorBox}>
                <Text style={m.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={m.actions}>
              <Pressable style={({ pressed }) => [m.cancelBtn, pressed && s.pressed]} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [m.saveBtn, pressed && s.pressed, !canSave && m.disabled]}
                onPress={onSave}
                disabled={!canSave}
              >
                {saving
                  ? <ActivityIndicator color={C.offWhite} size="small" />
                  : <Text style={m.saveBtnText}>{mode === "add" ? "Save Lap" : "Update Lap"}</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Track picker modal */}
      <PickerModal
        visible={trackPickerVisible}
        title="Select Track"
        items={tracks.map((t) => ({ id: t.id.toString(), label: t.name, sub: t.country }))}
        selectedId={form.trackId}
        onSelect={(id) => { onSet("trackId", id); setTrackPickerVisible(false); }}
        onClose={() => setTrackPickerVisible(false)}
      />

      {/* Car picker modal */}
      <PickerModal
        visible={carPickerVisible}
        title="Select Car"
        items={cars.map((c) => ({ id: c.id.toString(), label: `${c.year} ${c.make} ${c.model}`, sub: c.class }))}
        selectedId={form.carId}
        onSelect={(id) => { onSet("carId", id); setCarPickerVisible(false); }}
        onClose={() => setCarPickerVisible(false)}
      />
    </Modal>
  );
}

// ── Picker modal ───────────────────────────────────────────────────────────────

function PickerModal({ visible, title, items, selectedId, onSelect, onClose }: {
  visible: boolean;
  title: string;
  items: { id: string; label: string; sub?: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={p.overlay}>
        <Pressable style={p.backdrop} onPress={onClose} />
        <View style={[p.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={p.handle} />
          <Text style={p.title}>{title}</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            style={p.list}
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable style={({ pressed }) => [p.item, pressed && p.itemPressed]} onPress={() => onSelect(item.id)}>
                  <View style={p.itemText}>
                    <Text style={[p.itemLabel, selected && p.itemLabelSelected]}>{item.label}</Text>
                    {item.sub && <Text style={p.itemSub}>{item.sub}</Text>}
                  </View>
                  {selected && <Ionicons name="checkmark" size={18} color={C.red} />}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={p.sep} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Colours & styles ───────────────────────────────────────────────────────────

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

// Main screen styles
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

// Track group styles
const g = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  header: { backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flex: 1, marginRight: 12 },
  trackName: { fontSize: 15, fontWeight: "bold", color: C.offWhite },
  trackMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  stats: { flexDirection: "row", gap: 16 },
  stat: { alignItems: "flex-end" },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: C.muted },
  statBest: { fontSize: 15, fontWeight: "bold", color: C.red, fontVariant: ["tabular-nums"] },
  statPoss: { fontSize: 15, fontWeight: "bold", color: C.blue, fontVariant: ["tabular-nums"] },
});

// Lap row styles
const r = StyleSheet.create({
  row: { backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start", borderLeftWidth: 3, borderLeftColor: "transparent" },
  rowBest: { borderLeftColor: C.red },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  left: { flex: 1 },
  time: { fontSize: 17, fontWeight: "bold", color: C.offWhite, fontVariant: ["tabular-nums"] },
  timeBest: { color: C.red },
  car: { fontSize: 12, color: C.muted, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  condBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  condText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  date: { fontSize: 11, color: C.muted },
  sectors: { flexDirection: "row", gap: 12, marginTop: 6 },
  sector: { alignItems: "center" },
  sectorLabel: { fontSize: 9, color: C.muted, fontWeight: "700", letterSpacing: 1 },
  sectorVal: { fontSize: 11, color: C.muted, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 2, marginLeft: 8, marginTop: 2 },
  iconBtn: { padding: 6, borderRadius: 6 },
  iconPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
});

// Modal styles
const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%", borderTopWidth: 1, borderColor: C.border },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", color: C.offWhite, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 6 },
  required: { color: C.red },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 6 },
  optional: { fontSize: 10, fontWeight: "400", color: C.muted, textTransform: "none", letterSpacing: 0 },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 16 },
  pickerPressed: { opacity: 0.7 },
  pickerValue: { fontSize: 14, color: C.offWhite, flex: 1, marginRight: 8 },
  pickerPlaceholder: { fontSize: 14, color: C.muted, flex: 1, marginRight: 8 },
  row: { flexDirection: "row", gap: 10, marginBottom: 0 },
  flex1: { flex: 1 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.offWhite, marginBottom: 16 },
  textarea: { height: 72 },
  condRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  condPill: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  condPillText: { fontSize: 12, fontWeight: "600", color: C.muted },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: "#FF6B4A" },
  actions: { flexDirection: "row", gap: 12, marginBottom: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.muted },
  saveBtn: { flex: 2, backgroundColor: C.red, paddingVertical: 13, alignItems: "center", borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  disabled: { opacity: 0.4 },
});

// Picker modal styles
const p = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, borderTopWidth: 1, borderColor: C.border, maxHeight: "60%" },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "bold", color: C.offWhite, paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  itemPressed: { opacity: 0.6 },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 14, color: C.offWhite },
  itemLabelSelected: { color: C.red, fontWeight: "600" },
  itemSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  sep: { height: 1, backgroundColor: C.border },
});

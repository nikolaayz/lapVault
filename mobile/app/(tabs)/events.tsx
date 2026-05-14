import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { C } from "@/constants/colors";
import { emptyForm, eventToForm, type Event, type EventCar, type EventTrack, type EventFormState, type RegistrationStatus } from "@/lib/eventUtils";
import { EventCard } from "@/components/events/EventCard";
import { EventFormSheet } from "@/components/events/EventFormSheet";
import { RegisterSheet } from "@/components/events/RegisterSheet";
import { PickerModal } from "@/components/PickerModal";
import { m } from "@/components/events/sheetStyles";
import type { CarClass } from "@/lib/types";

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [cars, setCars] = useState<EventCar[]>([]);
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<"create" | "edit">("create");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [registeringEvent, setRegisteringEvent] = useState<Event | null>(null);
  const [registerCarId, setRegisterCarId] = useState("");
  const [carPickerVisible, setCarPickerVisible] = useState(false);
  const [trackPickerVisible, setTrackPickerVisible] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [eventsRes, carsRes, tracksRes, meRes] = await Promise.all([
        apiFetch("/api/events"),
        apiFetch("/api/cars"),
        apiFetch("/api/tracks"),
        apiFetch("/api/auth/me"),
      ]);
      if (eventsRes.status === 401) { router.replace("/login"); return; }
      const [eventsData, carsData, tracksData, meData] = await Promise.all([
        eventsRes.json(), carsRes.json(), tracksRes.json(), meRes.json(),
      ]);
      setEvents(eventsData);
      setCars(carsData);
      setTracks(tracksData);
      setIsAdmin(meData.role === "admin");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const now = new Date().toISOString();
  const upcoming = events.filter((e) => e.date >= now);
  const past = events.filter((e) => e.date < now).reverse();

  function openCreate() {
    setEventForm(emptyForm);
    setFormError("");
    setEventModalMode("create");
    setEditingEvent(null);
    setEventModalVisible(true);
  }

  function openEdit(event: Event) {
    setEventForm(eventToForm(event));
    setFormError("");
    setEventModalMode("edit");
    setEditingEvent(event);
    setEventModalVisible(true);
  }

  function openRegister(event: Event) {
    const allowed = event.allowedClasses;
    const compatible = allowed?.length ? cars.filter((c) => allowed.includes(c.class)) : cars;
    setRegisterCarId(compatible[0]?.id.toString() ?? cars[0]?.id.toString() ?? "");
    setFormError("");
    setRegisteringEvent(event);
    setRegisterModalVisible(true);
  }

  function setFormField<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
    setEventForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleClass(cls: CarClass) {
    setEventForm((prev) => ({
      ...prev,
      allowedClasses: prev.allowedClasses.includes(cls)
        ? prev.allowedClasses.filter((c) => c !== cls)
        : [...prev.allowedClasses, cls],
    }));
  }

  async function handleSaveEvent() {
    if (!eventForm.trackId || !eventForm.title.trim() || !eventForm.date.trim()) {
      setFormError("Track, title, and date are required.");
      return;
    }
    const parsedDate = new Date(eventForm.date);
    if (isNaN(parsedDate.getTime())) {
      setFormError("Invalid date — use YYYY-MM-DD HH:MM format.");
      return;
    }

    const payload = {
      trackId: parseInt(eventForm.trackId),
      title: eventForm.title.trim(),
      date: parsedDate.toISOString(),
      maxParticipants: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : null,
      allowedClasses: eventForm.allowedClasses.length ? eventForm.allowedClasses : null,
      description: eventForm.description.trim() || null,
    };

    setSaving(true);
    setFormError("");
    try {
      let res: Response;
      if (eventModalMode === "create") {
        res = await apiFetch("/api/events", { method: "POST", body: JSON.stringify(payload) });
      } else {
        res = await apiFetch(`/api/events/${editingEvent!.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to save event."); return; }

      await loadData();
      setEventModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(event: Event) {
    Alert.alert(
      "Delete Event",
      `Delete "${event.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteEvent(event.id) },
      ]
    );
  }

  async function deleteEvent(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/events/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRegister() {
    if (!registeringEvent || !registerCarId) { setFormError("Select a car."); return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await apiFetch(`/api/events/${registeringEvent.id}/register`, {
        method: "POST",
        body: JSON.stringify({ carId: parseInt(registerCarId) }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to register."); return; }
      setEvents((prev) => prev.map((e) =>
        e.id === registeringEvent.id
          ? { ...e, registrationCount: e.registrationCount + 1, myRegistration: { carId: parseInt(registerCarId), status: "confirmed" as RegistrationStatus } }
          : e
      ));
      setRegisterModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  async function cancelRegistration(eventId: number) {
    setCancellingId(eventId);
    try {
      await apiFetch(`/api/events/${eventId}/register`, { method: "DELETE" });
      setEvents((prev) => prev.map((e) =>
        e.id === eventId
          ? { ...e, registrationCount: Math.max(0, e.registrationCount - 1), myRegistration: null }
          : e
      ));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator style={s.loader} color={C.red} size="large" />
      </SafeAreaView>
    );
  }

  const selectedTrack = tracks.find((t) => t.id.toString() === eventForm.trackId);
  const registeringAllowed = registeringEvent?.allowedClasses;
  const compatibleCars = registeringAllowed?.length
    ? cars.filter((c) => registeringAllowed.includes(c.class))
    : cars;
  const selectedRegCar = cars.find((c) => c.id.toString() === registerCarId);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={C.red} />}
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Track Days</Text>
            <Text style={s.title}>Events</Text>
          </View>
          {isAdmin && (
            <Pressable style={({ pressed }) => [s.addBtn, pressed && s.pressed]} onPress={openCreate}>
              <Ionicons name="add" size={18} color={C.offWhite} />
              <Text style={s.addBtnText}>Create</Text>
            </Pressable>
          )}
        </View>

        {upcoming.length === 0 && past.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyTitle}>No events yet</Text>
            <Text style={s.emptySubtext}>Check back later for upcoming track days.</Text>
          </View>
        )}

        {upcoming.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Upcoming</Text>
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                cars={cars}
                isPast={false}
                deleting={deletingId === event.id}
                cancelling={cancellingId === event.id}
                onEdit={() => openEdit(event)}
                onDelete={() => confirmDelete(event)}
                onRegister={() => openRegister(event)}
                onCancelRegistration={() => cancelRegistration(event.id)}
              />
            ))}
          </View>
        )}

        {past.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Past</Text>
            {past.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                cars={cars}
                isPast
                deleting={deletingId === event.id}
                cancelling={false}
                onEdit={() => openEdit(event)}
                onDelete={() => confirmDelete(event)}
                onRegister={() => {}}
                onCancelRegistration={() => {}}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={eventModalVisible} animationType="slide" transparent onRequestClose={() => setEventModalVisible(false)}>
        <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={m.backdrop} onPress={() => setEventModalVisible(false)} />
          <EventFormSheet
            mode={eventModalMode}
            form={eventForm}
            selectedTrack={selectedTrack}
            saving={saving}
            error={formError}
            onOpenTrackPicker={() => setTrackPickerVisible(true)}
            onSet={setFormField}
            onToggleClass={toggleClass}
            onSave={handleSaveEvent}
            onClose={() => setEventModalVisible(false)}
          />
        </KeyboardAvoidingView>
        <PickerModal
          visible={trackPickerVisible}
          title="Select Track"
          items={tracks.map((t) => ({ id: t.id.toString(), label: t.name, sub: t.country }))}
          selectedId={eventForm.trackId}
          onSelect={(id) => { setFormField("trackId", id); setTrackPickerVisible(false); }}
          onClose={() => setTrackPickerVisible(false)}
        />
      </Modal>

      <Modal visible={registerModalVisible} animationType="slide" transparent onRequestClose={() => setRegisterModalVisible(false)}>
        <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={m.backdrop} onPress={() => setRegisterModalVisible(false)} />
          <RegisterSheet
            event={registeringEvent}
            compatibleCars={compatibleCars}
            allCars={cars}
            selectedCar={selectedRegCar}
            registerCarId={registerCarId}
            saving={saving}
            error={formError}
            onOpenCarPicker={() => setCarPickerVisible(true)}
            onRegister={handleRegister}
            onClose={() => setRegisterModalVisible(false)}
          />
        </KeyboardAvoidingView>
        <PickerModal
          visible={carPickerVisible}
          title="Select Car"
          items={cars.map((c) => ({
            id: c.id.toString(),
            label: `${c.year} ${c.make} ${c.model}`,
            sub: c.class,
            disabled: !!(registeringAllowed?.length && !registeringAllowed.includes(c.class)),
          }))}
          selectedId={registerCarId}
          onSelect={(id) => { setRegisterCarId(id); setCarPickerVisible(false); }}
          onClose={() => setCarPickerVisible(false)}
        />
      </Modal>
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
  section: { paddingHorizontal: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 12 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: C.offWhite },
  emptySubtext: { fontSize: 13, color: C.muted },
});

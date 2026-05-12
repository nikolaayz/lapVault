import { useCallback, useState } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type RegistrationStatus = "pending" | "confirmed" | "cancelled";
type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

interface EventTrack { id: number; name: string; country: string; lengthKm: string | null; }
interface EventCar { id: number; make: string; model: string; year: number; class: CarClass; }
interface Event {
  id: number;
  title: string;
  date: string;
  maxParticipants: number | null;
  allowedClasses: string[] | null;
  description: string | null;
  isCreator: boolean;
  creatorName: string;
  track: EventTrack;
  registrationCount: number;
  myRegistration: { carId: number; status: RegistrationStatus } | null;
}
interface EventFormState {
  trackId: string;
  title: string;
  date: string;
  maxParticipants: string;
  allowedClasses: CarClass[];
  description: string;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

const CAR_CLASSES: CarClass[] = ["Street", "Street Modified", "Track Prepared", "Race"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function getDateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-GB", { day: "2-digit" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
  };
}

const emptyForm: EventFormState = {
  trackId: "", title: "", date: "", maxParticipants: "", allowedClasses: [], description: "",
};

function eventToForm(event: Event): EventFormState {
  const d = new Date(event.date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return {
    trackId: event.track.id.toString(),
    title: event.title,
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
    maxParticipants: event.maxParticipants?.toString() ?? "",
    allowedClasses: (event.allowedClasses ?? []) as CarClass[],
    description: event.description ?? "",
  };
}

const statusColor: Record<RegistrationStatus, string> = {
  pending: "#FBBF24",
  confirmed: "#34D399",
  cancelled: "#6B6B80",
};
const statusBg: Record<RegistrationStatus, string> = {
  pending: "rgba(251,191,36,0.12)",
  confirmed: "rgba(52,211,153,0.12)",
  cancelled: "rgba(107,107,128,0.12)",
};
const statusLabel: Record<RegistrationStatus, string> = {
  pending: "Registered",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

// ── Main screen ────────────────────────────────────────────────────────────────

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
        {/* Header */}
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

        {/* Empty */}
        {upcoming.length === 0 && past.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyTitle}>No events yet</Text>
            <Text style={s.emptySubtext}>Check back later for upcoming track days.</Text>
          </View>
        )}

        {/* Upcoming */}
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

        {/* Past */}
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

      {/* Create / Edit event modal */}
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

      {/* Register modal */}
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

// ── Event card ─────────────────────────────────────────────────────────────────

function EventCard({ event, cars, isPast, deleting, cancelling, onEdit, onDelete, onRegister, onCancelRegistration }: {
  event: Event; cars: EventCar[]; isPast: boolean;
  deleting: boolean; cancelling: boolean;
  onEdit: () => void; onDelete: () => void;
  onRegister: () => void; onCancelRegistration: () => void;
}) {
  const { day, month, year } = getDateParts(event.date);
  const isFull = event.maxParticipants != null && event.registrationCount >= event.maxParticipants;
  const hasCompatibleCar = event.allowedClasses?.length
    ? cars.some((c) => event.allowedClasses!.includes(c.class))
    : cars.length > 0;

  return (
    <View style={[ec.card, isPast && ec.cardPast]}>
      <View style={ec.top}>
        {/* Date badge */}
        <View style={ec.dateBadge}>
          <Text style={ec.dateMonth}>{month}</Text>
          <Text style={ec.dateDay}>{day}</Text>
          <Text style={ec.dateYear}>{year}</Text>
        </View>

        {/* Details */}
        <View style={ec.details}>
          <View style={ec.titleRow}>
            <Text style={ec.title} numberOfLines={2}>{event.title}</Text>
            {event.myRegistration && (
              <View style={[ec.statusBadge, { backgroundColor: statusBg[event.myRegistration.status] }]}>
                <Text style={[ec.statusText, { color: statusColor[event.myRegistration.status] }]}>
                  {statusLabel[event.myRegistration.status]}
                </Text>
              </View>
            )}
          </View>
          <Text style={ec.trackInfo} numberOfLines={1}>
            {event.track.name} · {event.track.country}
            {event.track.lengthKm ? ` · ${event.track.lengthKm} km` : ""}
          </Text>
          <Text style={ec.meta}>{formatDate(event.date)}</Text>
          {event.maxParticipants != null && (
            <Text style={[ec.spots, isFull && ec.spotsFull]}>
              {event.registrationCount} / {event.maxParticipants} spots{isFull ? " · Full" : ""}
            </Text>
          )}
          {event.allowedClasses && event.allowedClasses.length > 0 && (
            <View style={ec.classes}>
              {event.allowedClasses.map((cls) => (
                <View key={cls} style={ec.classBadge}>
                  <Text style={ec.classText}>{cls}</Text>
                </View>
              ))}
            </View>
          )}
          {event.description ? (
            <Text style={ec.description} numberOfLines={2}>{event.description}</Text>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      {!isPast && (
        <View style={ec.actions}>
          <View style={ec.actionsLeft}>
            {event.isCreator && (
              <>
                <Pressable style={({ pressed }) => [ec.textBtn, pressed && s.pressed]} onPress={onEdit}>
                  <Text style={ec.textBtnLabel}>Edit</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [ec.textBtn, pressed && s.pressed]} onPress={onDelete} disabled={deleting}>
                  <Text style={[ec.textBtnLabel, ec.textBtnRed]}>{deleting ? "Deleting…" : "Delete"}</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={ec.actionsRight}>
            {event.myRegistration ? (
              <Pressable style={({ pressed }) => [ec.textBtn, pressed && s.pressed]} onPress={onCancelRegistration} disabled={cancelling}>
                <Text style={[ec.textBtnLabel, ec.textBtnRed]}>{cancelling ? "Cancelling…" : "Cancel registration"}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [ec.registerBtn, pressed && s.pressed, (isFull || !hasCompatibleCar || cars.length === 0) && ec.registerBtnDisabled]}
                onPress={onRegister}
                disabled={isFull || !hasCompatibleCar || cars.length === 0}
              >
                <Text style={ec.registerBtnText}>Register</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Event form sheet ───────────────────────────────────────────────────────────

function EventFormSheet({ mode, form, selectedTrack, saving, error, onOpenTrackPicker, onSet, onToggleClass, onSave, onClose }: {
  mode: "create" | "edit";
  form: EventFormState;
  selectedTrack: EventTrack | undefined;
  saving: boolean;
  error: string;
  onOpenTrackPicker: () => void;
  onSet: <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void;
  onToggleClass: (cls: CarClass) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const canSave = !!(form.trackId && form.title.trim() && form.date.trim() && !saving);

  return (
    <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={m.handle} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={m.title}>{mode === "create" ? "Create Event" : "Edit Event"}</Text>

        <Text style={m.label}>Title <Text style={m.required}>*</Text></Text>
        <TextInput style={m.input} placeholder="BMW Club Track Day" placeholderTextColor={C.muted} value={form.title} onChangeText={(v) => onSet("title", v)} />

        <Text style={m.label}>Track <Text style={m.required}>*</Text></Text>
        <Pressable style={({ pressed }) => [m.picker, pressed && { opacity: 0.7 }]} onPress={onOpenTrackPicker}>
          <Text style={selectedTrack ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
            {selectedTrack ? `${selectedTrack.name} — ${selectedTrack.country}` : "Select a track…"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.muted} />
        </Pressable>

        <Text style={m.label}>Date & Time <Text style={m.required}>*</Text></Text>
        <TextInput style={m.input} placeholder="2026-06-15 09:00" placeholderTextColor={C.muted} value={form.date} onChangeText={(v) => onSet("date", v)} />

        <Text style={m.label}>Max Participants</Text>
        <TextInput style={m.input} placeholder="20" placeholderTextColor={C.muted} value={form.maxParticipants} onChangeText={(v) => onSet("maxParticipants", v)} keyboardType="number-pad" />

        <Text style={m.label}>Allowed Classes <Text style={m.optional}>(empty = all)</Text></Text>
        <View style={m.classPicker}>
          {CAR_CLASSES.map((cls) => (
            <Pressable
              key={cls}
              style={[m.classPill, form.allowedClasses.includes(cls) && m.classPillActive]}
              onPress={() => onToggleClass(cls)}
            >
              <Text style={[m.classPillText, form.allowedClasses.includes(cls) && m.classPillTextActive]}>{cls}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={m.label}>Description</Text>
        <TextInput style={[m.input, m.textarea]} placeholder="Additional details, requirements, venue info..." placeholderTextColor={C.muted} value={form.description} onChangeText={(v) => onSet("description", v)} multiline numberOfLines={3} textAlignVertical="top" />

        {error ? <View style={m.errorBox}><Text style={m.errorText}>{error}</Text></View> : null}

        <View style={m.actions}>
          <Pressable style={({ pressed }) => [m.cancelBtn, pressed && s.pressed]} onPress={onClose}>
            <Text style={m.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [m.saveBtn, pressed && s.pressed, !canSave && m.disabled]} onPress={onSave} disabled={!canSave}>
            {saving
              ? <ActivityIndicator color={C.offWhite} size="small" />
              : <Text style={m.saveBtnText}>{mode === "create" ? "Create Event" : "Save Changes"}</Text>
            }
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Register sheet ─────────────────────────────────────────────────────────────

function RegisterSheet({ event, compatibleCars, allCars, selectedCar, registerCarId, saving, error, onOpenCarPicker, onRegister, onClose }: {
  event: Event | null;
  compatibleCars: EventCar[];
  allCars: EventCar[];
  selectedCar: EventCar | undefined;
  registerCarId: string;
  saving: boolean;
  error: string;
  onOpenCarPicker: () => void;
  onRegister: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!event) return null;

  const allowed = event.allowedClasses;
  const classOk = !allowed?.length || (selectedCar && allowed.includes(selectedCar.class));
  const canRegister = !!(registerCarId && classOk && !saving);

  return (
    <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={m.handle} />
      <Text style={m.title}>Register for Event</Text>
      <Text style={rs.subtitle}>{event.title} · {formatDate(event.date)}</Text>

      {allCars.length === 0 ? (
        <View style={rs.noCars}>
          <Text style={rs.noCarsText}>No cars in your garage.</Text>
          <Pressable onPress={onClose}>
            <Text style={rs.garageLink}>Go to Garage →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={m.label}>Car <Text style={m.required}>*</Text></Text>
          <Pressable style={({ pressed }) => [m.picker, pressed && { opacity: 0.7 }]} onPress={onOpenCarPicker}>
            <Text style={selectedCar ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
              {selectedCar ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}` : "Select a car…"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={C.muted} />
          </Pressable>
          {compatibleCars.length === 0 && (
            <Text style={rs.warning}>None of your cars match the allowed classes.</Text>
          )}
          {!classOk && selectedCar && (
            <Text style={rs.warning}>This car class is not allowed for this event.</Text>
          )}
        </>
      )}

      {error ? <View style={m.errorBox}><Text style={m.errorText}>{error}</Text></View> : null}

      <View style={m.actions}>
        <Pressable style={({ pressed }) => [m.cancelBtn, pressed && s.pressed]} onPress={onClose}>
          <Text style={m.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [m.saveBtn, pressed && s.pressed, !canRegister && m.disabled]} onPress={onRegister} disabled={!canRegister || allCars.length === 0}>
          {saving
            ? <ActivityIndicator color={C.offWhite} size="small" />
            : <Text style={m.saveBtnText}>Confirm Registration</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

// ── Picker modal ───────────────────────────────────────────────────────────────

function PickerModal({ visible, title, items, selectedId, onSelect, onClose }: {
  visible: boolean;
  title: string;
  items: { id: string; label: string; sub?: string; disabled?: boolean }[];
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
                <Pressable
                  style={({ pressed }) => [p.item, pressed && !item.disabled && p.itemPressed, item.disabled && p.itemDisabled]}
                  onPress={() => !item.disabled && onSelect(item.id)}
                >
                  <View style={p.itemText}>
                    <Text style={[p.itemLabel, selected && p.itemLabelSelected, item.disabled && p.itemLabelDisabled]}>{item.label}</Text>
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
  bg: "#0A0A0F", surface: "#12121A", card: "#1C1C2E", red: "#E63B19",
  offWhite: "#F0F0F5", muted: "#6B6B80", border: "#2A2A3A",
  errorBg: "rgba(230,59,25,0.1)", errorBorder: "rgba(230,59,25,0.25)",
} as const;

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

const ec = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: 12 },
  cardPast: { opacity: 0.55 },
  top: { flexDirection: "row", padding: 16, gap: 14 },
  dateBadge: { width: 52, backgroundColor: C.bg, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingVertical: 10, flexShrink: 0 },
  dateMonth: { fontSize: 9, fontWeight: "800", color: C.red, letterSpacing: 1.5 },
  dateDay: { fontSize: 22, fontWeight: "bold", color: C.offWhite, lineHeight: 26 },
  dateYear: { fontSize: 10, color: C.muted },
  details: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 15, fontWeight: "bold", color: C.offWhite },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, flexShrink: 0 },
  statusText: { fontSize: 10, fontWeight: "700" },
  trackInfo: { fontSize: 12, color: C.muted, marginBottom: 2 },
  meta: { fontSize: 11, color: C.muted, marginBottom: 4 },
  spots: { fontSize: 11, color: C.muted, marginBottom: 4 },
  spotsFull: { color: C.red },
  classes: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 4 },
  classBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "rgba(240,240,245,0.07)", borderWidth: 1, borderColor: C.border },
  classText: { fontSize: 10, fontWeight: "600", color: C.muted },
  description: { fontSize: 11, color: C.muted, lineHeight: 16 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  actionsLeft: { flexDirection: "row", gap: 4 },
  actionsRight: {},
  textBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  textBtnLabel: { fontSize: 12, fontWeight: "600", color: C.muted },
  textBtnRed: { color: C.red },
  registerBtn: { backgroundColor: C.red, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  registerBtnDisabled: { opacity: 0.35 },
  registerBtnText: { fontSize: 12, fontWeight: "700", color: C.offWhite },
});

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: "92%", borderTopWidth: 1, borderColor: C.border },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", color: C.offWhite, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 6, marginTop: 12 },
  required: { color: C.red },
  optional: { fontSize: 10, fontWeight: "400", color: C.muted, textTransform: "none", letterSpacing: 0 },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, marginBottom: 4 },
  pickerValue: { fontSize: 14, color: C.offWhite, flex: 1, marginRight: 8 },
  pickerPlaceholder: { fontSize: 14, color: C.muted, flex: 1, marginRight: 8 },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.offWhite, marginBottom: 4 },
  textarea: { height: 72, textAlignVertical: "top" },
  classPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  classPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  classPillActive: { borderColor: C.red, backgroundColor: "rgba(230,59,25,0.12)" },
  classPillText: { fontSize: 12, fontWeight: "600", color: C.muted },
  classPillTextActive: { color: C.red },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 8, padding: 12, marginTop: 8 },
  errorText: { fontSize: 13, color: "#FF6B4A" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.muted },
  saveBtn: { flex: 2, backgroundColor: C.red, paddingVertical: 13, alignItems: "center", borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  disabled: { opacity: 0.4 },
});

const rs = StyleSheet.create({
  subtitle: { fontSize: 13, color: C.muted, marginBottom: 8 },
  noCars: { alignItems: "center", paddingVertical: 20, gap: 8 },
  noCarsText: { fontSize: 14, color: C.muted },
  garageLink: { fontSize: 13, color: C.red, fontWeight: "600" },
  warning: { fontSize: 12, color: "#FBBF24", marginBottom: 8 },
});

const p = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, borderTopWidth: 1, borderColor: C.border, maxHeight: "60%" },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "bold", color: C.offWhite, paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: 20 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  itemPressed: { opacity: 0.6 },
  itemDisabled: { opacity: 0.35 },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 14, color: C.offWhite },
  itemLabelSelected: { color: C.red, fontWeight: "600" },
  itemLabelDisabled: { color: C.muted },
  itemSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  sep: { height: 1, backgroundColor: C.border },
});

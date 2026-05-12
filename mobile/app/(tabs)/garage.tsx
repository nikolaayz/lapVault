import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
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
import { apiFetch } from "@/lib/api";

type CarClass = "Street" | "Street Modified" | "Track Prepared" | "Race";

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  powerHp: number | null;
  weightKg: number | null;
  class: CarClass;
  modifications: string | null;
}

interface FormState {
  make: string;
  model: string;
  year: string;
  powerHp: string;
  weightKg: string;
  class: CarClass;
  modifications: string;
}

const CAR_CLASSES: CarClass[] = ["Street", "Street Modified", "Track Prepared", "Race"];

const emptyForm: FormState = {
  make: "",
  model: "",
  year: new Date().getFullYear().toString(),
  powerHp: "",
  weightKg: "",
  class: "Street",
  modifications: "",
};

function carToForm(car: Car): FormState {
  return {
    make: car.make,
    model: car.model,
    year: car.year.toString(),
    powerHp: car.powerHp?.toString() ?? "",
    weightKg: car.weightKg?.toString() ?? "",
    class: car.class,
    modifications: car.modifications ?? "",
  };
}

const classBadge: Record<CarClass, { bg: string; text: string; border: string }> = {
  Street: { bg: "rgba(59,130,246,0.12)", text: "#60A5FA", border: "rgba(59,130,246,0.25)" },
  "Street Modified": { bg: "rgba(240,240,245,0.07)", text: "#C0C0D0", border: "rgba(240,240,245,0.15)" },
  "Track Prepared": { bg: "rgba(230,59,25,0.1)", text: "#FF6B4A", border: "rgba(230,59,25,0.25)" },
  Race: { bg: "rgba(230,59,25,0.12)", text: "#E63B19", border: "rgba(230,59,25,0.3)" },
};

export default function GarageScreen() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const modelRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);
  const powerRef = useRef<TextInputType>(null);
  const weightRef = useRef<TextInputType>(null);

  const insets = useSafeAreaInsets();

  const loadCars = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiFetch("/api/cars");
      if (res.status === 401) { router.replace("/login"); return; }
      const data = await res.json();
      setCars(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCars(); }, [loadCars]);

  function openAdd() {
    setForm(emptyForm);
    setFormError("");
    setModalMode("add");
    setEditingCar(null);
    setModalVisible(true);
  }

  function openEdit(car: Car) {
    setForm(carToForm(car));
    setFormError("");
    setModalMode("edit");
    setEditingCar(car);
    setModalVisible(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.make.trim() || !form.model.trim() || !form.year) {
      setFormError("Make, model, and year are required.");
      return;
    }
    const yearNum = parseInt(form.year);
    if (isNaN(yearNum) || yearNum < 1950 || yearNum > new Date().getFullYear() + 1) {
      setFormError("Enter a valid year.");
      return;
    }

    setSaving(true);
    setFormError("");

    const payload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year: yearNum,
      class: form.class,
      powerHp: form.powerHp ? parseInt(form.powerHp) : null,
      weightKg: form.weightKg ? parseInt(form.weightKg) : null,
      modifications: form.modifications.trim() || null,
    };

    try {
      let res: Response;
      if (modalMode === "add") {
        res = await apiFetch("/api/cars", { method: "POST", body: JSON.stringify(payload) });
      } else {
        res = await apiFetch(`/api/cars/${editingCar!.id}`, { method: "PUT", body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed to save car."); return; }

      if (modalMode === "add") {
        setCars((prev) => [...prev, data]);
      } else {
        setCars((prev) => prev.map((c) => (c.id === data.id ? data : c)));
      }
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(car: Car) {
    Alert.alert(
      "Delete Car",
      `Remove ${car.year} ${car.make} ${car.model} from your garage?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCar(car.id),
        },
      ]
    );
  }

  async function deleteCar(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/api/cars/${id}`, { method: "DELETE" });
      setCars((prev) => prev.filter((c) => c.id !== id));
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
          <RefreshControl refreshing={refreshing} onRefresh={() => loadCars(true)} tintColor={C.red} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>Garage</Text>
            <Text style={s.title}>My Cars</Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && s.pressed]} onPress={openAdd}>
            <Ionicons name="add" size={18} color={C.offWhite} />
            <Text style={s.addBtnText}>Add Car</Text>
          </Pressable>
        </View>

        {cars.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏎</Text>
            <Text style={s.emptyTitle}>No cars yet</Text>
            <Text style={s.emptySubtext}>Add your first car to get started.</Text>
            <Pressable style={({ pressed }) => [s.addBtn, s.emptyBtn, pressed && s.pressed]} onPress={openAdd}>
              <Text style={s.addBtnText}>+ Add Car</Text>
            </Pressable>
          </View>
        ) : (
          cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onEdit={() => openEdit(car)}
              onDelete={() => confirmDelete(car)}
              deleting={deletingId === car.id}
            />
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={s.modalHandle} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle}>{modalMode === "add" ? "Add Car" : "Edit Car"}</Text>

              {/* Make + Model */}
              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={s.label}>Make <Text style={s.required}>*</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="BMW"
                    placeholderTextColor={C.muted}
                    value={form.make}
                    onChangeText={(v) => set("make", v)}
                    returnKeyType="next"
                    onSubmitEditing={() => modelRef.current?.focus()}
                  />
                </View>
                <View style={s.flex1}>
                  <Text style={s.label}>Model <Text style={s.required}>*</Text></Text>
                  <TextInput
                    ref={modelRef}
                    style={s.input}
                    placeholder="M3"
                    placeholderTextColor={C.muted}
                    value={form.model}
                    onChangeText={(v) => set("model", v)}
                    returnKeyType="next"
                    onSubmitEditing={() => yearRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Year + Power + Weight */}
              <View style={s.row}>
                <View style={s.flex1}>
                  <Text style={s.label}>Year <Text style={s.required}>*</Text></Text>
                  <TextInput
                    ref={yearRef}
                    style={s.input}
                    placeholder="2020"
                    placeholderTextColor={C.muted}
                    value={form.year}
                    onChangeText={(v) => set("year", v)}
                    keyboardType="number-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => powerRef.current?.focus()}
                  />
                </View>
                <View style={s.flex1}>
                  <Text style={s.label}>Power (hp)</Text>
                  <TextInput
                    ref={powerRef}
                    style={s.input}
                    placeholder="420"
                    placeholderTextColor={C.muted}
                    value={form.powerHp}
                    onChangeText={(v) => set("powerHp", v)}
                    keyboardType="number-pad"
                    returnKeyType="next"
                    onSubmitEditing={() => weightRef.current?.focus()}
                  />
                </View>
                <View style={s.flex1}>
                  <Text style={s.label}>Weight (kg)</Text>
                  <TextInput
                    ref={weightRef}
                    style={s.input}
                    placeholder="1450"
                    placeholderTextColor={C.muted}
                    value={form.weightKg}
                    onChangeText={(v) => set("weightKg", v)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Class picker */}
              <Text style={s.label}>Class <Text style={s.required}>*</Text></Text>
              <View style={s.classPicker}>
                {CAR_CLASSES.map((cls) => (
                  <Pressable
                    key={cls}
                    style={[s.classPill, form.class === cls && s.classPillActive]}
                    onPress={() => set("class", cls)}
                  >
                    <Text style={[s.classPillText, form.class === cls && s.classPillTextActive]}>
                      {cls}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Modifications */}
              <Text style={s.label}>Modifications</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Stage 2 tune, coilovers, roll cage..."
                placeholderTextColor={C.muted}
                value={form.modifications}
                onChangeText={(v) => set("modifications", v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {formError ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>{formError}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View style={s.modalActions}>
                <Pressable
                  style={({ pressed }) => [s.cancelBtn, pressed && s.pressed]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={s.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.saveBtn, pressed && s.pressed, saving && s.disabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color={C.offWhite} size="small" />
                    : <Text style={s.saveBtnText}>Save</Text>
                  }
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function CarCard({
  car,
  onEdit,
  onDelete,
  deleting,
}: {
  car: Car;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const badge = classBadge[car.class];
  return (
    <View style={cs.card}>
      <View style={cs.cardTop}>
        <View style={cs.cardMain}>
          <Text style={cs.carName} numberOfLines={1}>
            {car.year} {car.make} {car.model}
          </Text>
          <View style={[cs.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[cs.badgeText, { color: badge.text }]}>{car.class}</Text>
          </View>
        </View>
        <View style={cs.actions}>
          <Pressable style={({ pressed }) => [cs.iconBtn, pressed && cs.iconPressed]} onPress={onEdit}>
            <Ionicons name="pencil-outline" size={16} color={C.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [cs.iconBtn, pressed && cs.iconPressed]}
            onPress={onDelete}
            disabled={deleting}
          >
            {deleting
              ? <ActivityIndicator size="small" color={C.muted} />
              : <Ionicons name="trash-outline" size={16} color={C.muted} />
            }
          </Pressable>
        </View>
      </View>

      <View style={cs.specs}>
        <View style={cs.spec}>
          <Text style={cs.specLabel}>Power</Text>
          <Text style={cs.specValue}>{car.powerHp != null ? `${car.powerHp} hp` : "—"}</Text>
        </View>
        <View style={cs.specDivider} />
        <View style={cs.spec}>
          <Text style={cs.specLabel}>Weight</Text>
          <Text style={cs.specValue}>{car.weightKg != null ? `${car.weightKg} kg` : "—"}</Text>
        </View>
      </View>

      {car.modifications ? (
        <Text style={cs.mods} numberOfLines={2}>{car.modifications}</Text>
      ) : null}
    </View>
  );
}

const C = {
  bg: "#0A0A0F",
  surface: "#12121A",
  card: "#1C1C2E",
  red: "#E63B19",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "bold", color: C.offWhite },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.red,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: C.offWhite },
  pressed: { opacity: 0.75 },

  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: C.offWhite },
  emptySubtext: { fontSize: 13, color: C.muted, marginBottom: 12 },
  emptyBtn: { paddingHorizontal: 24 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: C.offWhite,
    marginBottom: 20,
  },

  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  flex1: { flex: 1 },

  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
    marginBottom: 6,
  },
  required: { color: C.red },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: C.offWhite,
    marginBottom: 16,
  },
  textarea: { height: 80, marginBottom: 16 },

  classPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  classPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  classPillActive: {
    borderColor: C.red,
    backgroundColor: "rgba(230,59,25,0.12)",
  },
  classPillText: { fontSize: 12, fontWeight: "600", color: C.muted },
  classPillTextActive: { color: C.red },

  errorBox: {
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: "#FF6B4A" },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.muted },
  saveBtn: {
    flex: 2,
    backgroundColor: C.red,
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 8,
  },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  disabled: { opacity: 0.5 },
});

const cs = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardMain: { flex: 1, gap: 8 },
  carName: {
    fontSize: 16,
    fontWeight: "bold",
    color: C.offWhite,
    paddingRight: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  actions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    padding: 7,
    borderRadius: 8,
  },
  iconPressed: { backgroundColor: "rgba(255,255,255,0.06)" },

  specs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spec: { gap: 2 },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.muted,
  },
  specValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.offWhite,
  },
  specDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  mods: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});

import { useCallback, useEffect, useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { apiFetch, apiUpload } from "@/lib/api";
import { C } from "@/constants/colors";
import { emptyCarForm, carToForm, type Car, type GarageFormState } from "@/lib/garageUtils";
import { CarCard } from "@/components/garage/CarCard";
import { CarModal } from "@/components/garage/CarModal";

export default function GarageScreen() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [form, setForm] = useState<GarageFormState>(emptyCarForm);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
    setForm(emptyCarForm);
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

  function set<K extends keyof GarageFormState>(key: K, value: GarageFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to add a car photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploadingPhoto(true);
    setFormError("");
    try {
      const form = new FormData();
      form.append("file", { uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "car.jpg" } as any);
      form.append("folder", "cars");
      const res = await apiUpload("/api/upload", form);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(data.error ?? "Upload failed"); return; }
      set("photoUrl", data.url);
    } finally {
      setUploadingPhoto(false);
    }
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
      photoUrl: form.photoUrl || null,
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
        { text: "Delete", style: "destructive", onPress: () => deleteCar(car.id) },
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

      <CarModal
        visible={modalVisible}
        mode={modalMode}
        form={form}
        saving={saving}
        uploadingPhoto={uploadingPhoto}
        error={formError}
        onSet={set}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        onPickPhoto={handlePickPhoto}
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
  emptyBtn: { paddingHorizontal: 24 },
});

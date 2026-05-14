import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";
import { m } from "@/components/events/sheetStyles";
import { formatDateLong } from "@/lib/formatters";
import type { Event, EventCar } from "@/lib/eventUtils";

const pressedStyle = { opacity: 0.75 } as const;

export function RegisterSheet({ event, compatibleCars, allCars, selectedCar, registerCarId, saving, error, onOpenCarPicker, onRegister, onClose }: {
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
      <Text style={rs.subtitle}>{event.title} · {formatDateLong(event.date)}</Text>

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
        <Pressable style={({ pressed }) => [m.cancelBtn, pressed && pressedStyle]} onPress={onClose}>
          <Text style={m.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [m.saveBtn, pressed && pressedStyle, !canRegister && m.disabled]} onPress={onRegister} disabled={!canRegister || allCars.length === 0}>
          {saving
            ? <ActivityIndicator color={C.offWhite} size="small" />
            : <Text style={m.saveBtnText}>Confirm Registration</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

const rs = StyleSheet.create({
  subtitle: { fontSize: 13, color: C.muted, marginBottom: 8 },
  noCars: { alignItems: "center", paddingVertical: 20, gap: 8 },
  noCarsText: { fontSize: 14, color: C.muted },
  garageLink: { fontSize: 13, color: C.red, fontWeight: "600" },
  warning: { fontSize: 12, color: "#FBBF24", marginBottom: 8 },
});

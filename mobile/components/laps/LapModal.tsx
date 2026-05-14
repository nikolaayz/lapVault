import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";
import { PickerModal } from "@/components/PickerModal";
import { conditionColor, conditionBg, type LapCar, type Track, type LapFormState, type Conditions } from "@/lib/lapUtils";

const pressedStyle = { opacity: 0.75 } as const;

export function LapModal({ visible, mode, form, cars, tracks, saving, error, onSet, onSave, onClose }: {
  visible: boolean;
  mode: "add" | "edit";
  form: LapFormState;
  cars: LapCar[];
  tracks: Track[];
  saving: boolean;
  error: string;
  onSet: <K extends keyof LapFormState>(key: K, value: LapFormState[K]) => void;
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

            <Text style={m.label}>Track <Text style={m.required}>*</Text></Text>
            <Pressable style={({ pressed }) => [m.picker, pressed && m.pickerPressed]} onPress={() => setTrackPickerVisible(true)}>
              <Text style={selectedTrack ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
                {selectedTrack ? `${selectedTrack.name} — ${selectedTrack.country}` : "Select a track…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </Pressable>

            <Text style={m.label}>Car <Text style={m.required}>*</Text></Text>
            <Pressable style={({ pressed }) => [m.picker, pressed && m.pickerPressed]} onPress={() => setCarPickerVisible(true)}>
              <Text style={selectedCar ? m.pickerValue : m.pickerPlaceholder} numberOfLines={1}>
                {selectedCar ? `${selectedCar.year} ${selectedCar.make} ${selectedCar.model}` : "Select a car…"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.muted} />
            </Pressable>

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

            {error ? <View style={m.errorBox}><Text style={m.errorText}>{error}</Text></View> : null}

            <View style={m.actions}>
              <Pressable style={({ pressed }) => [m.cancelBtn, pressed && pressedStyle]} onPress={onClose}>
                <Text style={m.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [m.saveBtn, pressed && pressedStyle, !canSave && m.disabled]}
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

      <PickerModal
        visible={trackPickerVisible}
        title="Select Track"
        items={tracks.map((t) => ({ id: t.id.toString(), label: t.name, sub: t.country }))}
        selectedId={form.trackId}
        onSelect={(id) => { onSet("trackId", id); setTrackPickerVisible(false); }}
        onClose={() => setTrackPickerVisible(false)}
      />

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

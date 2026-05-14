import { useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";
import { CAR_CLASSES } from "@/lib/types";
import type { GarageFormState } from "@/lib/garageUtils";

const pressedStyle = { opacity: 0.75 } as const;

export function CarModal({ visible, mode, form, saving, error, onSet, onSave, onClose }: {
  visible: boolean;
  mode: "add" | "edit";
  form: GarageFormState;
  saving: boolean;
  error: string;
  onSet: <K extends keyof GarageFormState>(key: K, value: GarageFormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const modelRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);
  const powerRef = useRef<TextInputType>(null);
  const weightRef = useRef<TextInputType>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={m.backdrop} onPress={onClose} />
        <View style={[m.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={m.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={m.title}>{mode === "add" ? "Add Car" : "Edit Car"}</Text>

            <View style={m.row}>
              <View style={m.flex1}>
                <Text style={m.label}>Make <Text style={m.required}>*</Text></Text>
                <TextInput
                  style={m.input}
                  placeholder="BMW"
                  placeholderTextColor={C.muted}
                  value={form.make}
                  onChangeText={(v) => onSet("make", v)}
                  returnKeyType="next"
                  onSubmitEditing={() => modelRef.current?.focus()}
                />
              </View>
              <View style={m.flex1}>
                <Text style={m.label}>Model <Text style={m.required}>*</Text></Text>
                <TextInput
                  ref={modelRef}
                  style={m.input}
                  placeholder="M3"
                  placeholderTextColor={C.muted}
                  value={form.model}
                  onChangeText={(v) => onSet("model", v)}
                  returnKeyType="next"
                  onSubmitEditing={() => yearRef.current?.focus()}
                />
              </View>
            </View>

            <View style={m.row}>
              <View style={m.flex1}>
                <Text style={m.label}>Year <Text style={m.required}>*</Text></Text>
                <TextInput
                  ref={yearRef}
                  style={m.input}
                  placeholder="2020"
                  placeholderTextColor={C.muted}
                  value={form.year}
                  onChangeText={(v) => onSet("year", v)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => powerRef.current?.focus()}
                />
              </View>
              <View style={m.flex1}>
                <Text style={m.label}>Power (hp)</Text>
                <TextInput
                  ref={powerRef}
                  style={m.input}
                  placeholder="420"
                  placeholderTextColor={C.muted}
                  value={form.powerHp}
                  onChangeText={(v) => onSet("powerHp", v)}
                  keyboardType="number-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => weightRef.current?.focus()}
                />
              </View>
              <View style={m.flex1}>
                <Text style={m.label}>Weight (kg)</Text>
                <TextInput
                  ref={weightRef}
                  style={m.input}
                  placeholder="1450"
                  placeholderTextColor={C.muted}
                  value={form.weightKg}
                  onChangeText={(v) => onSet("weightKg", v)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={m.label}>Class <Text style={m.required}>*</Text></Text>
            <View style={m.classPicker}>
              {CAR_CLASSES.map((cls) => (
                <Pressable
                  key={cls}
                  style={[m.classPill, form.class === cls && m.classPillActive]}
                  onPress={() => onSet("class", cls)}
                >
                  <Text style={[m.classPillText, form.class === cls && m.classPillTextActive]}>
                    {cls}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={m.label}>Modifications</Text>
            <TextInput
              style={[m.input, m.textarea]}
              placeholder="Stage 2 tune, coilovers, roll cage..."
              placeholderTextColor={C.muted}
              value={form.modifications}
              onChangeText={(v) => onSet("modifications", v)}
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
                style={({ pressed }) => [m.saveBtn, pressed && pressedStyle, saving && m.disabled]}
                onPress={onSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={C.offWhite} size="small" />
                  : <Text style={m.saveBtnText}>Save</Text>
                }
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: "90%", borderTopWidth: 1, borderColor: C.border },
  handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "bold", color: C.offWhite, marginBottom: 20 },
  row: { flexDirection: "row", gap: 10, marginBottom: 16 },
  flex1: { flex: 1 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 6 },
  required: { color: C.red },
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.offWhite, marginBottom: 16 },
  textarea: { height: 80, marginBottom: 16 },
  classPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  classPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  classPillActive: { borderColor: C.red, backgroundColor: "rgba(230,59,25,0.12)" },
  classPillText: { fontSize: 12, fontWeight: "600", color: C.muted },
  classPillTextActive: { color: C.red },
  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: "#FF6B4A" },
  actions: { flexDirection: "row", gap: 12, marginTop: 4, marginBottom: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 14, fontWeight: "600", color: C.muted },
  saveBtn: { flex: 2, backgroundColor: C.red, paddingVertical: 13, alignItems: "center", borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  disabled: { opacity: 0.5 },
});

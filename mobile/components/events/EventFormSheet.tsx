import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";
import { CAR_CLASSES } from "@/lib/types";
import { m } from "@/components/events/sheetStyles";
import type { EventFormState, EventTrack } from "@/lib/eventUtils";
import type { CarClass } from "@/lib/types";

const pressedStyle = { opacity: 0.75 } as const;

export function EventFormSheet({ mode, form, selectedTrack, saving, error, onOpenTrackPicker, onSet, onToggleClass, onSave, onClose }: {
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
          <Pressable style={({ pressed }) => [m.cancelBtn, pressed && pressedStyle]} onPress={onClose}>
            <Text style={m.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [m.saveBtn, pressed && pressedStyle, !canSave && m.disabled]} onPress={onSave} disabled={!canSave}>
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

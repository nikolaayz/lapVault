import { Modal, View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "@/constants/colors";

export function PickerModal({ visible, title, items, selectedId, onSelect, onClose }: {
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

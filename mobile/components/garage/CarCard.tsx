import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { classBadge } from "@/lib/types";
import type { Car } from "@/lib/garageUtils";

export function CarCard({ car, onEdit, onDelete, deleting }: {
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

const cs = StyleSheet.create({
  card: { marginHorizontal: 20, marginBottom: 12, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  cardMain: { flex: 1, gap: 8 },
  carName: { fontSize: 16, fontWeight: "bold", color: C.offWhite, paddingRight: 8 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 7, borderRadius: 8 },
  iconPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
  specs: { flexDirection: "row", alignItems: "center", gap: 12 },
  spec: { gap: 2 },
  specLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: C.muted },
  specValue: { fontSize: 14, fontWeight: "600", color: C.offWhite },
  specDivider: { width: 1, height: 28, backgroundColor: C.border },
  mods: { fontSize: 12, color: C.muted, lineHeight: 18, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
});

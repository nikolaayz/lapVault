import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { formatMs, formatDate } from "@/lib/formatters";
import { conditionColor, conditionBg } from "@/lib/lapUtils";
import type { Lap, LapGroup, Conditions } from "@/lib/lapUtils";

export function TrackGroup({ group, onEdit, onDelete, deletingId }: {
  group: LapGroup;
  onEdit: (lap: Lap) => void;
  onDelete: (lap: Lap) => void;
  deletingId: number | null;
}) {
  return (
    <View style={g.wrap}>
      <View style={g.header}>
        <View style={g.headerLeft}>
          <Text style={g.trackName} numberOfLines={1}>{group.track.name}</Text>
          <Text style={g.trackMeta}>
            {group.track.country}{group.track.lengthKm ? ` · ${group.track.lengthKm} km` : ""}
            {" · "}{group.laps.length} {group.laps.length === 1 ? "lap" : "laps"}
          </Text>
        </View>
        <View style={g.stats}>
          <View style={g.stat}>
            <Text style={g.statLabel}>Best</Text>
            <Text style={g.statBest}>{formatMs(group.bestMs)}</Text>
          </View>
          {group.possibleBestMs != null && (
            <View style={g.stat}>
              <Text style={g.statLabel}>Poss. Best</Text>
              <Text style={g.statPoss}>{formatMs(group.possibleBestMs)}</Text>
            </View>
          )}
        </View>
      </View>

      {group.laps.map((lap, i) => (
        <LapRow
          key={lap.id}
          lap={lap}
          isBest={lap.lapTimeMs === group.bestMs}
          isLast={i === group.laps.length - 1}
          onEdit={() => onEdit(lap)}
          onDelete={() => onDelete(lap)}
          deleting={deletingId === lap.id}
        />
      ))}
    </View>
  );
}

function LapRow({ lap, isBest, isLast, onEdit, onDelete, deleting }: {
  lap: Lap;
  isBest: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <View style={[r.row, isBest && r.rowBest, !isLast && r.rowDivider]}>
      <View style={r.left}>
        <Text style={[r.time, isBest && r.timeBest]}>{formatMs(lap.lapTimeMs)}</Text>
        <Text style={r.car} numberOfLines={1}>
          {lap.car.year} {lap.car.make} {lap.car.model}
        </Text>
        <View style={r.meta}>
          <View style={[r.condBadge, { backgroundColor: conditionBg[lap.conditions as Conditions] }]}>
            <Text style={[r.condText, { color: conditionColor[lap.conditions as Conditions] }]}>
              {lap.conditions}
            </Text>
          </View>
          <Text style={r.date}>{formatDate(lap.createdAt)}</Text>
        </View>
        {(lap.sector1Ms != null || lap.sector2Ms != null || lap.sector3Ms != null) && (
          <View style={r.sectors}>
            {[lap.sector1Ms, lap.sector2Ms, lap.sector3Ms].map((s, i) => (
              <View key={i} style={r.sector}>
                <Text style={r.sectorLabel}>S{i + 1}</Text>
                <Text style={r.sectorVal}>{s != null ? formatMs(s) : "—"}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={r.actions}>
        <Pressable style={({ pressed }) => [r.iconBtn, pressed && r.iconPressed]} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={15} color={C.muted} />
        </Pressable>
        <Pressable style={({ pressed }) => [r.iconBtn, pressed && r.iconPressed]} onPress={onDelete} disabled={deleting}>
          {deleting
            ? <ActivityIndicator size="small" color={C.muted} />
            : <Ionicons name="trash-outline" size={15} color={C.muted} />
          }
        </Pressable>
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  header: { backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flex: 1, marginRight: 12 },
  trackName: { fontSize: 15, fontWeight: "bold", color: C.offWhite },
  trackMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  stats: { flexDirection: "row", gap: 16 },
  stat: { alignItems: "flex-end" },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: C.muted },
  statBest: { fontSize: 15, fontWeight: "bold", color: C.red, fontVariant: ["tabular-nums"] },
  statPoss: { fontSize: 15, fontWeight: "bold", color: C.blue, fontVariant: ["tabular-nums"] },
});

const r = StyleSheet.create({
  row: { backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start", borderLeftWidth: 3, borderLeftColor: "transparent" },
  rowBest: { borderLeftColor: C.red },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  left: { flex: 1 },
  time: { fontSize: 17, fontWeight: "bold", color: C.offWhite, fontVariant: ["tabular-nums"] },
  timeBest: { color: C.red },
  car: { fontSize: 12, color: C.muted, marginTop: 2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  condBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  condText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  date: { fontSize: 11, color: C.muted },
  sectors: { flexDirection: "row", gap: 12, marginTop: 6 },
  sector: { alignItems: "center" },
  sectorLabel: { fontSize: 9, color: C.muted, fontWeight: "700", letterSpacing: 1 },
  sectorVal: { fontSize: 11, color: C.muted, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: 2, marginLeft: 8, marginTop: 2 },
  iconBtn: { padding: 6, borderRadius: 6 },
  iconPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
});

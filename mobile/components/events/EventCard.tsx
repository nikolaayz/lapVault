import { View, Text, Pressable, StyleSheet } from "react-native";
import { C } from "@/constants/colors";
import { formatDateLong, getDateParts } from "@/lib/formatters";
import { statusColor, statusBg, statusLabel } from "@/lib/eventUtils";
import type { Event, EventCar } from "@/lib/eventUtils";

export function EventCard({ event, cars, isPast, deleting, cancelling, onEdit, onDelete, onRegister, onCancelRegistration }: {
  event: Event;
  cars: EventCar[];
  isPast: boolean;
  deleting: boolean;
  cancelling: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRegister: () => void;
  onCancelRegistration: () => void;
}) {
  const { day, month, year } = getDateParts(event.date);
  const isFull = event.maxParticipants != null && event.registrationCount >= event.maxParticipants;
  const hasCompatibleCar = event.allowedClasses?.length
    ? cars.some((c) => event.allowedClasses!.includes(c.class))
    : cars.length > 0;

  return (
    <View style={[ec.card, isPast && ec.cardPast]}>
      <View style={ec.top}>
        <View style={ec.dateBadge}>
          <Text style={ec.dateMonth}>{month}</Text>
          <Text style={ec.dateDay}>{day}</Text>
          <Text style={ec.dateYear}>{year}</Text>
        </View>

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
          <Text style={ec.meta}>{formatDateLong(event.date)}</Text>
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

      {!isPast && (
        <View style={ec.actions}>
          <View style={ec.actionsLeft}>
            {event.isCreator && (
              <>
                <Pressable style={({ pressed }) => [ec.textBtn, pressed && ec.pressed]} onPress={onEdit}>
                  <Text style={ec.textBtnLabel}>Edit</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [ec.textBtn, pressed && ec.pressed]} onPress={onDelete} disabled={deleting}>
                  <Text style={[ec.textBtnLabel, ec.textBtnRed]}>{deleting ? "Deleting…" : "Delete"}</Text>
                </Pressable>
              </>
            )}
          </View>
          <View style={ec.actionsRight}>
            {event.myRegistration ? (
              <Pressable style={({ pressed }) => [ec.textBtn, pressed && ec.pressed]} onPress={onCancelRegistration} disabled={cancelling}>
                <Text style={[ec.textBtnLabel, ec.textBtnRed]}>{cancelling ? "Cancelling…" : "Cancel registration"}</Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [ec.registerBtn, pressed && ec.pressed, (isFull || !hasCompatibleCar || cars.length === 0) && ec.registerBtnDisabled]}
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
  pressed: { opacity: 0.75 },
});

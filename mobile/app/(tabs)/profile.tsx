import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Text style={s.icon}>👤</Text>
        <Text style={s.title}>Profile</Text>
        <Text style={s.sub}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0F" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  icon: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: "#F0F0F5" },
  sub: { fontSize: 13, color: "#6B6B80" },
});

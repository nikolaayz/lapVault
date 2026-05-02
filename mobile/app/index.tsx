import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        <Text style={styles.red}>LAP</Text>VAULT
      </Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#F0F0F5",
    letterSpacing: 2,
  },
  red: {
    color: "#E63B19",
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B6B80",
    letterSpacing: 1,
  },
});
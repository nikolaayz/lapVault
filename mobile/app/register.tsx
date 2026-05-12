import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  type TextInput as TextInputType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_BASE } from "@/constants/api";
import { saveToken } from "@/lib/auth";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      await saveToken(data.token);
      router.replace("/(tabs)");
    } catch {
      setError("Could not connect to the server. Check your network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back / logo */}
          <Pressable style={s.backRow} onPress={() => router.back()}>
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLogo}>
              <Text style={s.red}>LAP</Text>VAULT
            </Text>
          </Pressable>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.heading}>Create your account</Text>
            <Text style={s.subheading}>Start logging your lap times for free.</Text>

            {/* Name */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Name</Text>
              <TextInput
                style={s.input}
                placeholder="John Doe"
                placeholderTextColor={C.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput
                ref={emailRef}
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <View style={s.fieldGroup}>
              <Text style={s.label}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={s.input}
                placeholder="Min. 8 characters"
                placeholderTextColor={C.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [s.btnPrimary, pressed && s.pressed, loading && s.disabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={C.offWhite} size="small" />
              ) : (
                <Text style={s.btnPrimaryText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          {/* Footer link */}
          <View style={s.footerRow}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={s.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const C = {
  bg: "#0A0A0F",
  surface: "#12121A",
  card: "#1C1C2E",
  red: "#E63B19",
  offWhite: "#F0F0F5",
  muted: "#6B6B80",
  border: "#2A2A3A",
  errorBg: "rgba(230,59,25,0.1)",
  errorBorder: "rgba(230,59,25,0.25)",
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backArrow: { fontSize: 20, color: C.muted },
  backLogo: { fontSize: 18, fontWeight: "bold", color: C.offWhite, letterSpacing: 2 },
  red: { color: C.red },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    gap: 16,
  },

  heading: { fontSize: 24, fontWeight: "bold", color: C.offWhite },
  subheading: { fontSize: 14, color: C.muted, marginTop: -8 },

  fieldGroup: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.muted,
  },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.offWhite,
  },

  errorBox: {
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: { fontSize: 13, color: "#FF6B4A", lineHeight: 18 },

  btnPrimary: {
    backgroundColor: C.red,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnPrimaryText: { color: C.offWhite, fontWeight: "700", fontSize: 15 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, color: C.offWhite, fontWeight: "600" },
});
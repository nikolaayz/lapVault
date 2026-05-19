import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, apiUpload } from "@/lib/api";
import { deleteToken } from "@/lib/auth";
import { C } from "@/constants/colors";

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const emailRef = useRef<TextInputType>(null);
  const newPasswordRef = useRef<TextInputType>(null);
  const confirmPasswordRef = useRef<TextInputType>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiFetch("/api/profile");
      if (res.status === 401) { router.replace("/login"); return; }
      const data = await res.json();
      setName(data.name);
      setEmail(data.email);
      setAvatarUrl(data.avatarUrl ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadProfile(); }, [loadProfile]));

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setUploadingAvatar(true);
    setAccountError("");
    try {
      const form = new FormData();
      form.append("file", { uri: asset.uri, type: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "photo.jpg" } as any);
      form.append("folder", "profiles");
      const uploadRes = await apiUpload("/api/upload", form);
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) { setAccountError(uploadData.error ?? "Upload failed"); return; }

      const newUrl: string = uploadData.url;
      const saveRes = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name, email, avatarUrl: newUrl }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) { setAccountError(saveData.error ?? "Failed to save avatar"); return; }
      setAvatarUrl(newUrl);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveAccount() {
    if (!name.trim()) { setAccountError("Name is required."); return; }
    if (!email.trim()) { setAccountError("Email is required."); return; }

    setAccountError("");
    setAccountSuccess(false);
    setAccountSaving(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setAccountError(data.error ?? "Failed to save changes."); return; }
      setName(data.name);
      setEmail(data.email);
      setAccountSuccess(true);
    } finally {
      setAccountSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) { setPasswordError("Current password is required."); return; }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }

    setPasswordError("");
    setPasswordSuccess(false);
    setPasswordSaving(true);
    try {
      const res = await apiFetch("/api/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPasswordError(data.error ?? "Failed to update password."); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
    } finally {
      setPasswordSaving(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: handleLogout },
      ]
    );
  }

  async function handleLogout() {
    await deleteToken();
    router.replace("/");
  }

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator style={s.loader} color={C.red} size="large" />
      </SafeAreaView>
    );
  }

  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.header}>
            <Text style={s.eyebrow}>Account</Text>
            <Text style={s.title}>Profile</Text>
          </View>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar} style={s.avatarPressable}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
              )}
              <View style={s.avatarOverlay}>
                {uploadingAvatar
                  ? <ActivityIndicator color={C.offWhite} size="small" />
                  : <Text style={s.avatarOverlayText}>Edit</Text>
                }
              </View>
            </Pressable>
            <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
              <Text style={s.changePhotoText}>{uploadingAvatar ? "Uploading…" : "Change photo"}</Text>
            </Pressable>
            <Text style={s.avatarName}>{name}</Text>
            <Text style={s.avatarEmail}>{email}</Text>
          </View>

          {/* Account details */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Account Details</Text>

            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              placeholder="Your name"
              placeholderTextColor={C.muted}
              value={name}
              onChangeText={(v) => { setName(v); setAccountSuccess(false); }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <Text style={s.label}>Email</Text>
            <TextInput
              ref={emailRef}
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={C.muted}
              value={email}
              onChangeText={(v) => { setEmail(v); setAccountSuccess(false); }}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSaveAccount}
            />

            {accountError ? <View style={s.errorBox}><Text style={s.errorText}>{accountError}</Text></View> : null}
            {accountSuccess ? <View style={s.successBox}><Text style={s.successText}>Changes saved.</Text></View> : null}

            <Pressable
              style={({ pressed }) => [s.saveBtn, pressed && s.pressed, accountSaving && s.disabled]}
              onPress={handleSaveAccount}
              disabled={accountSaving}
            >
              {accountSaving
                ? <ActivityIndicator color={C.offWhite} size="small" />
                : <Text style={s.saveBtnText}>Save Changes</Text>
              }
            </Pressable>
          </View>

          {/* Change password */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Change Password</Text>

            <Text style={s.label}>Current Password</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={C.muted}
              value={currentPassword}
              onChangeText={(v) => { setCurrentPassword(v); setPasswordSuccess(false); }}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />

            <Text style={s.label}>New Password</Text>
            <TextInput
              ref={newPasswordRef}
              style={s.input}
              placeholder="Min. 8 characters"
              placeholderTextColor={C.muted}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setPasswordSuccess(false); }}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            <Text style={s.label}>Confirm New Password</Text>
            <TextInput
              ref={confirmPasswordRef}
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={C.muted}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setPasswordSuccess(false); }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />

            {passwordError ? <View style={s.errorBox}><Text style={s.errorText}>{passwordError}</Text></View> : null}
            {passwordSuccess ? <View style={s.successBox}><Text style={s.successText}>Password updated.</Text></View> : null}

            <Pressable
              style={({ pressed }) => [s.saveBtn, pressed && s.pressed, passwordSaving && s.disabled]}
              onPress={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving
                ? <ActivityIndicator color={C.offWhite} size="small" />
                : <Text style={s.saveBtnText}>Update Password</Text>
              }
            </Pressable>
          </View>

          {/* Sign out */}
          <Pressable style={({ pressed }) => [s.signOutBtn, pressed && s.pressed]} onPress={confirmLogout}>
            <Text style={s.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  kav: { flex: 1 },
  scroll: { paddingBottom: 40 },
  loader: { flex: 1 },

  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: C.red, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "bold", color: C.offWhite },

  avatarWrap: { alignItems: "center", paddingVertical: 28 },
  avatarPressable: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.red,
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarOverlay: {
    position: "absolute", inset: 0, borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  avatarOverlayText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  avatarText: { fontSize: 26, fontWeight: "bold", color: C.red },
  changePhotoText: { fontSize: 12, color: C.red, marginBottom: 10 },
  avatarName: { fontSize: 18, fontWeight: "bold", color: C.offWhite, marginBottom: 4 },
  avatarEmail: { fontSize: 13, color: C.muted },

  card: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", color: C.offWhite, marginBottom: 16 },

  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: C.muted, marginBottom: 6 },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.offWhite, marginBottom: 14,
  },

  errorBox: { backgroundColor: C.errorBg, borderWidth: 1, borderColor: C.errorBorder, borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, color: "#FF6B4A" },
  successBox: { backgroundColor: C.successBg, borderWidth: 1, borderColor: C.successBorder, borderRadius: 8, padding: 12, marginBottom: 14 },
  successText: { fontSize: 13, color: "#34D399" },

  saveBtn: { backgroundColor: C.red, borderRadius: 8, paddingVertical: 13, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: C.offWhite },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },

  signOutBtn: {
    marginHorizontal: 20, marginTop: 8,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingVertical: 14, alignItems: "center",
  },
  signOutText: { fontSize: 14, fontWeight: "600", color: C.muted },
});

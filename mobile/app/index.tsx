import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { C } from "@/constants/colors";

const { width } = Dimensions.get("window");

const features = [
  {
    icon: "⏱",
    title: "Log Lap Times",
    description: "Record every lap with sector splits, conditions, and notes.",
    accentColor: C.red,
  },
  {
    icon: "🏆",
    title: "Live Leaderboards",
    description: "Compete on track-specific boards separated by car class.",
    accentColor: C.blue,
  },
  {
    icon: "📅",
    title: "Track Day Events",
    description: "Browse upcoming events and register with your car.",
    accentColor: C.red,
  },
  {
    icon: "🚗",
    title: "Your Garage",
    description: "Manage your cars with specs, mods, and photos.",
    accentColor: C.blue,
  },
];

const steps = [
  { number: "1", title: "Create your account", description: "Sign up for free and set up your driver profile in under a minute." },
  { number: "2", title: "Add your car", description: "Enter your car's details and class. Add photos and modifications." },
  { number: "3", title: "Hit the track", description: "Log your laps, track your progress, and climb the leaderboard." },
];

const stats = [
  { value: "10K+", label: "Laps Logged" },
  { value: "50+", label: "Tracks" },
  { value: "500+", label: "Drivers" },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoRow}>
          <Text style={s.logoText}>
            <Text style={s.logoRed}>LAP</Text>VAULT
          </Text>
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.eyebrow}>Motorsport Data Platform</Text>
          <Text style={s.headline}>
            Track Your Times.{"\n"}
            <Text style={s.headlineRed}>Own Your Data.</Text>
          </Text>
          <Text style={s.subtitle}>
            LapVault is the track day companion for serious drivers. Log lap times,
            manage your garage, compete on leaderboards, and register for events.
          </Text>
          <View style={s.heroCtas}>
            <Pressable
              style={({ pressed }) => [s.btnPrimary, pressed && s.pressed]}
              onPress={() => router.push("/register")}
            >
              <Text style={s.btnPrimaryText}>Start for Free</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.btnSecondary, pressed && s.pressed]}
              onPress={() => router.push("/login")}
            >
              <Text style={s.btnSecondaryText}>Log In</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.statsRow}>
          {stats.map((stat, i) => (
            <View key={stat.label} style={[s.statItem, i < stats.length - 1 && s.statDivider]}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={s.section}>
          <Text style={s.sectionEyebrow}>What You Get</Text>
          <Text style={s.sectionTitle}>Everything a track day driver needs</Text>
          <View style={s.featureGrid}>
            {features.map((f) => (
              <View key={f.title} style={[s.featureCard, { borderLeftColor: f.accentColor }]}>
                <Text style={s.featureIcon}>{f.icon}</Text>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={[s.section, s.sectionSurface]}>
          <Text style={[s.sectionEyebrow, { color: C.red }]}>Getting Started</Text>
          <Text style={s.sectionTitle}>Up and running in minutes</Text>
          <View style={s.steps}>
            {steps.map((step) => (
              <View key={step.number} style={s.stepRow}>
                <Text style={s.stepNumber}>{step.number}</Text>
                <View style={s.stepContent}>
                  <Text style={s.stepTitle}>{step.title}</Text>
                  <Text style={s.stepDesc}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={s.cta}>
          <Text style={s.ctaTitle}>Ready to beat your best lap?</Text>
          <Text style={s.ctaSubtitle}>
            Join hundreds of drivers already using LapVault on track.
          </Text>
          <Pressable
            style={({ pressed }) => [s.btnPrimary, s.btnFull, pressed && s.pressed]}
            onPress={() => router.push("/register")}
          >
            <Text style={s.btnPrimaryText}>Create Free Account</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.btnSecondary, s.btnFull, pressed && s.pressed]}
            onPress={() => router.push("/login")}
          >
            <Text style={s.btnSecondaryText}>Already have an account? Log In</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerLogo}>
            <Text style={{ color: C.red }}>LAP</Text>
            <Text style={{ color: C.offWhite }}>VAULT</Text>
          </Text>
          <Text style={s.footerText}>Track day data platform</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingBottom: 32,
  },

  // Logo
  logoRow: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.offWhite,
    letterSpacing: 2,
  },
  logoRed: {
    color: C.red,
  },

  // Hero
  hero: {
    backgroundColor: C.surface,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.red,
    marginBottom: 16,
  },
  headline: {
    fontSize: 36,
    fontWeight: "bold",
    color: C.offWhite,
    lineHeight: 44,
    marginBottom: 16,
  },
  headlineRed: {
    color: C.red,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: C.muted,
    marginBottom: 32,
  },
  heroCtas: {
    flexDirection: "row",
    gap: 12,
  },

  // Buttons
  btnPrimary: {
    flex: 1,
    backgroundColor: C.red,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: C.offWhite,
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: C.card,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  btnSecondaryText: {
    color: C.offWhite,
    fontWeight: "600",
    fontSize: 14,
  },
  btnFull: {
    flex: 0,
    width: "100%",
  },
  pressed: {
    opacity: 0.75,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statItem: {
    flex: 1,
    paddingVertical: 20,
    alignItems: "center",
  },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: C.offWhite,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.5,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  sectionSurface: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.blue,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: C.offWhite,
    marginBottom: 24,
    lineHeight: 32,
  },

  // Feature grid
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 3,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.offWhite,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },

  // Steps
  steps: {
    gap: 24,
  },
  stepRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  stepNumber: {
    fontSize: 40,
    fontWeight: "bold",
    color: C.red,
    opacity: 0.35,
    lineHeight: 44,
    width: 36,
    textAlign: "center",
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.offWhite,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: C.muted,
  },

  // CTA
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  ctaTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: C.offWhite,
    textAlign: "center",
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    marginBottom: 8,
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
    gap: 4,
  },
  footerLogo: {
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1.5,
  },
  footerText: {
    fontSize: 12,
    color: C.muted,
  },
});

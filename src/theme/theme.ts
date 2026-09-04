// StudFlow Design-System: schlichtes Weiß mit dunkelblauen Akzenten.

export const colors = {
  background: "#F5F8FF",
  backgroundAlt: "#EAF0FF",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F5FF",
  border: "#D9E3FF",
  primary: "#0F2A5D",
  primaryDark: "#0A1F45",
  accent: "#1E4FD8",
  accentAlt: "#4F7DFF",
  success: "#1F9D73",
  textPrimary: "#112245",
  textSecondary: "#4B5D7A",
  textMuted: "#7A87A7",
  white: "#FFFFFF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: colors.textPrimary },
  h2: { fontSize: 22, fontWeight: "700" as const, color: colors.textPrimary },
  h3: { fontSize: 17, fontWeight: "700" as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.textSecondary },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, color: colors.textPrimary },
  caption: { fontSize: 12, fontWeight: "500" as const, color: colors.textMuted },
};

export default { colors, spacing, radius, typography };

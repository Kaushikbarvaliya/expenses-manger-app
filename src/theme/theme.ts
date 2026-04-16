// Global Theme System - Based on Dashboard Design
export const COLORS = {
  // Primary Colors
  primary: "#7C3AED",
  primaryLight: "#A78BFA",
  primaryDark: "#6D28D9",
  primaryBackground: "#EDE9FE",
  
  // Background Colors
  background: "#F4F4F8",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  
  // Text Colors
  text: "#111827",
  text2: "#4B5563",
  text3: "#6B7280",
  text4: "#9CA3AF",
  textWhite: "#FFFFFF",
  
  // Border & UI Colors
  border: "rgba(0,0,0,0.08)",
  borderLight: "#E5E7EB",
  shadow: "#000",
  
  // Status Colors
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Gradient Colors
  gradientStart: "#7C3AED",
  gradientEnd: "#A78BFA",
};

export const FONTS = {
  // Font Families (using system fonts)
  family: {
    regular: "System",
    medium: "System",
    bold: "System",
  },
  
  // Font Sizes
  size: {
    xs: 11,
    sm: 12,
    base: 13,
    lg: 14,
    xl: 15,
    "2xl": 16,
    "3xl": 18,
    "4xl": 20,
    "5xl": 24,
    "6xl": 28,
    "7xl": 32,
  },
  
  // Font Weights
  weight: {
    light: "400" as const,
    normal: "500" as const,
    medium: "600" as const,
    semibold: "700" as const,
    bold: "800" as const,
    black: "900" as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 6,
  base: 8,
  lg: 10,
  xl: 12,
  "2xl": 15,
  "3xl": 16,
  "4xl": 20,
  "5xl": 24,
  "6xl": 30,
  "7xl": 40,
  "8xl": 50,
  "9xl": 60,
  "10xl": 80,
  "11xl": 100,
  "12xl": 120,
};

export const BORDER_RADIUS = {
  xs: 6,
  sm: 8,
  base: 10,
  lg: 12,
  xl: 14,
  "2xl": 15,
  "3xl": 20,
  "4xl": 24,
  "5xl": 30,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
};

export const TYPOGRAPHY = {
  // Heading Styles
  h1: {
    fontSize: FONTS.size["6xl"],
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: FONTS.size["5xl"],
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: FONTS.size["4xl"],
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
  },
  h4: {
    fontSize: FONTS.size["3xl"],
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
  },
  h5: {
    fontSize: FONTS.size["2xl"],
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
  },
  h6: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
  },
  
  // Body Text Styles
  bodyLarge: {
    fontSize: FONTS.size.lg,
    fontWeight: FONTS.weight.normal,
    color: COLORS.text2,
    lineHeight: 22,
  },
  body: {
    fontSize: FONTS.size.base,
    fontWeight: FONTS.weight.normal,
    color: COLORS.text2,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.normal,
    color: COLORS.text3,
    lineHeight: 18,
  },
  caption: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.medium,
    color: COLORS.text4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  
  // Specialized Text Styles
  button: {
    fontSize: FONTS.size["2xl"],
    fontWeight: FONTS.weight.black,
    color: COLORS.textWhite,
  },
  buttonText: {
    fontSize: FONTS.size.base,
    fontWeight: FONTS.weight.medium,
    color: COLORS.textWhite,
  },
  link: {
    fontSize: FONTS.size.base,
    fontWeight: FONTS.weight.black,
    color: COLORS.primary,
  },
  label: {
    fontSize: FONTS.size.xs,
    fontWeight: FONTS.weight.black,
    color: COLORS.text3,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  input: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.normal,
    color: COLORS.text,
  },
  price: {
    fontSize: FONTS.size["3xl"],
    fontWeight: FONTS.weight.black,
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: FONTS.size.xl,
    fontWeight: FONTS.weight.semibold,
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: FONTS.size.sm,
    fontWeight: FONTS.weight.normal,
    color: COLORS.text3,
  },
};

export const COMPONENT_STYLES = {
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screen: {
    flex: 1,
    paddingHorizontal: SPACING["4xl"],
  },
  
  // Card Styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS["4xl"],
    padding: SPACING["3xl"],
    ...SHADOWS.sm,
  },
  cardLarge: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS["5xl"],
    padding: SPACING["5xl"],
    ...SHADOWS.base,
  },
  cardSmall: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  
  // Button Styles
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS["3xl"],
    paddingVertical: SPACING["3xl"],
    paddingHorizontal: SPACING["5xl"],
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...SHADOWS.md,
  },
  buttonLarge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS["4xl"],
    paddingVertical: SPACING["4xl"],
    paddingHorizontal: SPACING["6xl"],
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...SHADOWS.lg,
  },
  buttonSmall: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING["3xl"],
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...SHADOWS.sm,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderRadius: BORDER_RADIUS["3xl"],
    paddingVertical: SPACING["3xl"],
    paddingHorizontal: SPACING["5xl"],
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    borderRadius: BORDER_RADIUS["3xl"],
    paddingVertical: SPACING["3xl"],
    paddingHorizontal: SPACING["5xl"],
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  
  // Input Styles
  input: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS["3xl"],
    padding: SPACING["3xl"],
    fontSize: FONTS.size.xl,
    color: COLORS.text,
    fontWeight: FONTS.weight.normal,
  },
  inputLarge: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS["4xl"],
    padding: SPACING["4xl"],
    fontSize: FONTS.size["2xl"],
    color: COLORS.text,
    fontWeight: FONTS.weight.normal,
  },
  inputSmall: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    fontSize: FONTS.size.base,
    color: COLORS.text,
    fontWeight: FONTS.weight.normal,
  },
  
  // Header Styles
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING["4xl"],
    paddingTop: SPACING["5xl"],
    paddingBottom: SPACING["3xl"],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerLarge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING["5xl"],
    paddingTop: SPACING["6xl"],
    paddingBottom: SPACING["4xl"],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  
  // List Item Styles
  listItem: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS["4xl"],
    padding: SPACING["3xl"],
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  listItemLarge: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS["5xl"],
    padding: SPACING["4xl"],
    marginBottom: SPACING["3xl"],
    ...SHADOWS.base,
  },
  
  // Badge Styles
  badge: {
    backgroundColor: COLORS.primaryBackground,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    alignItems: "center" as const,
  },
  badgeSmall: {
    backgroundColor: COLORS.primaryBackground,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center" as const,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS["5xl"],
    padding: SPACING["5xl"],
    marginHorizontal: SPACING["4xl"],
    maxHeight: "80%",
    ...SHADOWS.xl,
  },
  
  // Gradient Styles
  gradient: {
    colors: [COLORS.gradientStart, COLORS.gradientEnd],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export const theme = {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  TYPOGRAPHY,
  COMPONENT_STYLES,
};

export default theme;

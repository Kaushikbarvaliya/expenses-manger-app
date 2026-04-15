export const COLORS = {
  bg: "#F8F9FE",
  surface: "#ffffff",
  surface2: "#f0f0f6",
  surface3: "#e8e8f0",
  border: "rgba(0,0,0,0.05)",
  border2: "rgba(0,0,0,0.08)",
  text: "#1A1A2E",
  text2: "#6B7280",
  text3: "#9CA3AF",
  
  // New Purple Palette
  primary: "#7C3AED", // Violet-600
  primaryLight: "#A78BFA",
  primaryGradient: ["#8B5CF6", "#A78BFA"], // Violet-500 to Violet-400
  secondary: "#4F46E5", // Indigo-600
  
  accent: "#7c6aff",
  accent2: "#6655ee",
  accentGlow: "rgba(124,106,255,0.15)",
  
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  pink: "#EC4899",
  
  // Specific UI colors
  insightBanner: "#111827",
  glassBg: "rgba(255, 255, 255, 0.7)",
};


export const CATEGORIES = [
  { id: "food", label: "Food", icon: "🍔", color: "#f97316" },
  { id: "rent", label: "Rent", icon: "🏠", color: "#8b5cf6" },
  { id: "travel", label: "Travel", icon: "✈️", color: "#3b82f6" },
  { id: "shopping", label: "Shopping", icon: "🛍️", color: "#ec4899" },
  { id: "bills", label: "Bills", icon: "⚡", color: "#eab308" },
  { id: "emi", label: "EMI", icon: "💳", color: "#ef4444" },
  { id: "health", label: "Health", icon: "💊", color: "#10b981" },
  { id: "education", label: "Education", icon: "📚", color: "#06b6d4" },
  { id: "entertainment", label: "Fun", icon: "🎬", color: "#a855f7" },
  { id: "groceries", label: "Grocery", icon: "🛒", color: "#84cc16" },
  { id: "fuel", label: "Fuel", icon: "⛽", color: "#f59e0b" },
  { id: "other", label: "Other", icon: "📦", color: "#64748b" },
];

export const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: "📲" },
  { id: "card", label: "Card", icon: "💳" },
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "netbanking", label: "NetBank", icon: "🏦" },
  { id: "wallet", label: "Wallet", icon: "👛" },
  { id: "salary", label: "Salary", icon: "💰" },
];

export const INCOME_SOURCES = [
  { id: "salary", label: "Salary", icon: "💰", color: "#10b981" },
  { id: "freelance", label: "Freelance", icon: "💻", color: "#3b82f6" },
  { id: "business", label: "Business", icon: "🏢", color: "#8b5cf6" },
  { id: "investments", label: "Investments", icon: "📈", color: "#f59e0b" },
  { id: "rental", label: "Rental", icon: "🏠", color: "#ec4899" },
  { id: "bonus", label: "Bonus", icon: "🎁", color: "#f97316" },
  { id: "other", label: "Other", icon: "➕", color: "#64748b" },
];

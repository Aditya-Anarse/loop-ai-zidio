export type SentimentType = "positive" | "negative" | "neutral";
export type ChannelType = "email" | "chat" | "social" | "phone" | "other";
export type StatusType = "NEW" | "REVIEWED" | "ACTIONED";

export interface FeedbackItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string;
  customerLabel: "vip" | "enterprise" | "growth" | "free" | "churn_risk";
  text: string;
  channel: ChannelType;
  sentiment: SentimentType;
  theme: string;
  status: StatusType;
  date: string; // ISO string or relative time
  createdAt: Date;
}

export const initialFeedbacks: FeedbackItem[] = [
  {
    id: "fb-1",
    customerName: "Alex Rivera",
    customerEmail: "alex.rivera@acme.com",
    customerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
    customerLabel: "enterprise",
    text: "The new analytics dashboard loads much faster now! Great job on performance optimization, but could we add PDF exports soon?",
    channel: "email",
    sentiment: "positive",
    theme: "Performance",
    status: "NEW",
    date: "2 hours ago",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: "fb-2",
    customerName: "Jane Doe",
    customerEmail: "jane@safari-tech.io",
    customerAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
    customerLabel: "churn_risk",
    text: "Experiencing a bug where the settings tab breaks in Safari when reloading the dashboard. Other browsers seem fine.",
    channel: "chat",
    sentiment: "negative",
    theme: "Bug",
    status: "REVIEWED",
    date: "5 hours ago",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: "fb-3",
    customerName: "Marcus Sterling",
    customerEmail: "m.sterling@capital-invest.com",
    customerAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80",
    customerLabel: "vip",
    text: "Is there any discount available for annual billing? We are planning to expand our team size to 25 seats next month.",
    channel: "phone",
    sentiment: "neutral",
    theme: "Billing",
    status: "ACTIONED",
    date: "1 day ago",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-4",
    customerName: "Chloe Watson",
    customerEmail: "chloe.watson@socialflow.co",
    customerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80",
    customerLabel: "growth",
    text: "The AI tagging feature is amazing! It correctly sorted 98% of our ticket volume. Would love to customize tag names.",
    channel: "social",
    sentiment: "positive",
    theme: "AI Features",
    status: "NEW",
    date: "2 days ago",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-5",
    customerName: "David Chen",
    customerEmail: "dchen@freemail.net",
    customerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80",
    customerLabel: "free",
    text: "Testing out the free version. Simple and elegant layout. Will consider upgrading next week if team approves.",
    channel: "other",
    sentiment: "neutral",
    theme: "UI/UX",
    status: "NEW",
    date: "3 days ago",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-6",
    customerName: "Emma Watson",
    customerEmail: "emma.watson@enterprise-cloud.com",
    customerAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
    customerLabel: "enterprise",
    text: "We need single sign-on (SSO) support via SAML/OIDC. Our security team cannot clear this platform without corporate SSO.",
    channel: "email",
    sentiment: "neutral",
    theme: "Security",
    status: "REVIEWED",
    date: "4 days ago",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-7",
    customerName: "Julian Vester",
    customerEmail: "julian@fintech-partners.de",
    customerAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&q=80",
    customerLabel: "vip",
    text: "The data latency in the analytics panel is sometimes reaching 5 seconds. In high frequency setups, this is too slow.",
    channel: "chat",
    sentiment: "negative",
    theme: "Performance",
    status: "NEW",
    date: "4 days ago",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-8",
    customerName: "Sophia Martinez",
    customerEmail: "smartinez@growthlabs.io",
    customerAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
    customerLabel: "growth",
    text: "Adding new members to our team workspace was extremely easy. The invitation flow is frictionless. Good job!",
    channel: "other",
    sentiment: "positive",
    theme: "General",
    status: "ACTIONED",
    date: "5 days ago",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-9",
    customerName: "Thomas Wright",
    customerEmail: "twright@legacy-inc.com",
    customerAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80",
    customerLabel: "churn_risk",
    text: "The billing system charged us twice for the seat additions this month. Tried reaching phone support, but stayed on hold for 20 mins.",
    channel: "phone",
    sentiment: "negative",
    theme: "Billing",
    status: "NEW",
    date: "6 days ago",
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-10",
    customerName: "Olivia Kim",
    customerEmail: "olivia.k@creativeagents.co",
    customerAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&q=80",
    customerLabel: "free",
    text: "Can we get custom themes for dark mode? The default dark mode is great but we prefer a higher contrast pure black option.",
    channel: "social",
    sentiment: "neutral",
    theme: "UI/UX",
    status: "REVIEWED",
    date: "1 week ago",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-11",
    customerName: "Arthur Morgan",
    customerEmail: "amorgan@van-der-linde.net",
    customerAvatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&h=100&fit=crop&q=80",
    customerLabel: "vip",
    text: "The AI recommendations for answering feedback are solid, but it needs an option to select tone of voice (e.g. professional vs casual).",
    channel: "email",
    sentiment: "positive",
    theme: "AI Features",
    status: "ACTIONED",
    date: "1 week ago",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
  },
  {
    id: "fb-12",
    customerName: "Lily Evans",
    customerEmail: "levans@hogwarts.edu",
    customerAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&q=80",
    customerLabel: "growth",
    text: "We encountered an issue where bulk exporting entries to CSV results in messed up encoding for emojis. Please check Unicode exports.",
    channel: "chat",
    sentiment: "negative",
    theme: "Bug",
    status: "NEW",
    date: "1 week ago",
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
  }
];

// Recharts trends & chart mock datasets
export const trendData = [
  { date: "Jul 07", volume: 110, positive: 75, negative: 15, neutral: 20 },
  { date: "Jul 08", volume: 135, positive: 90, negative: 25, neutral: 20 },
  { date: "Jul 09", volume: 120, positive: 80, negative: 18, neutral: 22 },
  { date: "Jul 10", volume: 145, positive: 102, negative: 22, neutral: 21 },
  { date: "Jul 11", volume: 160, positive: 115, negative: 20, neutral: 25 },
  { date: "Jul 12", volume: 150, positive: 110, negative: 22, neutral: 18 },
  { date: "Jul 13", volume: 175, positive: 130, negative: 25, neutral: 20 },
];

export const sentimentDistribution = [
  { name: "Positive", value: 65, color: "#10b981" },
  { name: "Neutral", value: 20, color: "#f59e0b" },
  { name: "Negative", value: 15, color: "#ef4444" },
];

export const themeDistribution = [
  { name: "AI Features", value: 42, color: "#7C3AED" },
  { name: "UI/UX", value: 31, color: "#6366F1" },
  { name: "Performance", value: 24, color: "#A78BFA" },
  { name: "Bug Fixes", value: 19, color: "#EF4444" },
  { name: "Billing", value: 15, color: "#F59E0B" },
  { name: "Security", value: 12, color: "#10B981" },
];

export const channelDistribution = [
  { name: "Email", value: 410, fill: "#6366F1" },
  { name: "Live Chat", value: 320, fill: "#10B981" },
  { name: "Social Media", value: 280, fill: "#7C3AED" },
  { name: "Phone Support", value: 190, fill: "#F59E0B" },
  { name: "Web Portal", value: 228, fill: "#94A3B8" },
];

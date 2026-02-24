export const API = "http://localhost:4000";

export const DOW = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const NEON = {
  cyan: "#00f5ff",
  green: "#00ff88",
  purple: "#bf5af2",
  orange: "#ff9f0a",
  pink: "#ff375f",
  blue: "#0a84ff",
};

export const fmt = (n?: number) => (n ?? 0).toLocaleString();

export const ago = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
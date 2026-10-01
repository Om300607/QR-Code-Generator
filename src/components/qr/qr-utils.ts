export type QRType = "url" | "text" | "email" | "phone" | "wifi";
export type DotType = "square" | "rounded" | "dots" | "classy" | "extra-rounded";
export type ECLevel = "L" | "M" | "Q" | "H";

export interface Content {
  url: string;
  text: string;
  email: string;
  subject: string;
  body: string;
  phone: string;
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface Style {
  size: number;
  margin: number;
  fg: string;
  fg2: string;
  gradient: boolean;
  bg: string;
  ec: ECLevel;
  dotType: DotType;
  logo: string | null;
}

export const defaultContent: Content = {
  url: "https://example.com",
  text: "",
  email: "",
  subject: "",
  body: "",
  phone: "",
  ssid: "",
  password: "",
  security: "WPA",
  hidden: false,
};

export const defaultStyle: Style = {
  size: 512,
  margin: 16,
  fg: "#1c1a17",
  fg2: "#e8552b",
  gradient: false,
  bg: "#ffffff",
  ec: "M",
  dotType: "square",
  logo: null,
};

export const presets: { name: string; style: Partial<Style> }[] = [
  { name: "Classic", style: { fg: "#000000", bg: "#ffffff", gradient: false, dotType: "square", ec: "M" } },
  { name: "Ember", style: { fg: "#c2410c", fg2: "#7c2d12", bg: "#fff7ed", gradient: true, dotType: "rounded", ec: "Q" } },
  { name: "Ocean", style: { fg: "#0e7490", fg2: "#1e3a8a", bg: "#f0f9ff", gradient: true, dotType: "dots", ec: "Q" } },
  { name: "Forest", style: { fg: "#166534", bg: "#f7fee7", gradient: false, dotType: "classy", ec: "M" } },
  { name: "Ink", style: { fg: "#1c1a17", bg: "#f5efe3", gradient: false, dotType: "extra-rounded", ec: "H" } },
];

const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRe = /^\+?[0-9\s\-()]{5,20}$/;

export function buildPayload(type: QRType, c: Content): { data: string; error: string | null } {
  switch (type) {
    case "url": {
      const v = c.url.trim();
      if (!v) return { data: "", error: "Enter a URL." };
      try {
        const u = new URL(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`);
        if (!u.hostname.includes(".")) throw new Error();
        return { data: u.toString(), error: null };
      } catch {
        return { data: "", error: "That doesn't look like a valid URL." };
      }
    }
    case "text":
      if (!c.text.trim()) return { data: "", error: "Enter some text." };
      if (c.text.length > 1500) return { data: "", error: "Text is too long (max 1500 characters)." };
      return { data: c.text, error: null };
    case "email": {
      if (!emailRe.test(c.email.trim())) return { data: "", error: "Enter a valid email address." };
      const p = new URLSearchParams();
      if (c.subject) p.set("subject", c.subject);
      if (c.body) p.set("body", c.body);
      const q = p.toString().replace(/\+/g, "%20");
      return { data: `mailto:${c.email.trim()}${q ? `?${q}` : ""}`, error: null };
    }
    case "phone":
      if (!phoneRe.test(c.phone.trim())) return { data: "", error: "Enter a valid phone number (digits, +, spaces, dashes)." };
      return { data: `tel:${c.phone.replace(/[\s\-()]/g, "")}`, error: null };
    case "wifi":
      if (!c.ssid.trim()) return { data: "", error: "Network name (SSID) is required." };
      if (c.security !== "nopass" && !c.password) return { data: "", error: "Password is required for secured networks." };
      if (c.security === "WPA" && c.password.length < 8) return { data: "", error: "WPA passwords must be at least 8 characters." };
      return {
        data: `WIFI:T:${c.security};S:${wifiEsc(c.ssid)};${c.security !== "nopass" ? `P:${wifiEsc(c.password)};` : ""}${c.hidden ? "H:true;" : ""};`,
        error: null,
      };
  }
}

function lum(hex: string) {
  const n = hex.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

export function readabilityWarnings(s: Style): string[] {
  const w: string[] = [];
  const fgs = s.gradient ? [s.fg, s.fg2] : [s.fg];
  const minC = Math.min(...fgs.map((f) => contrast(f, s.bg)));
  if (minC < 3) w.push(`Low contrast (${minC.toFixed(1)}:1). Aim for at least 4:1 between code and background.`);
  if (fgs.some((f) => lum(f) > lum(s.bg))) w.push("Code is lighter than the background — many scanners can't read inverted QR codes.");
  if (s.margin < 8) w.push("Very small quiet zone (margin). Some scanners need empty space around the code.");
  if (s.logo && (s.ec === "L" || s.ec === "M")) w.push("A logo covers part of the code. Use error correction Q or H.");
  if (s.size < 160) w.push("Small size may be hard to scan when printed.");
  return w;
}

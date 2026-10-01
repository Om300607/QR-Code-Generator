import { useEffect, useMemo, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import {
  buildPayload, defaultContent, defaultStyle, presets, readabilityWarnings,
  type Content, type DotType, type ECLevel, type QRType, type Style,
} from "./qr-utils";

const TYPES: { id: QRType; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Text" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "wifi", label: "Wi‑Fi" },
];
const DOTS: DotType[] = ["square", "rounded", "dots", "classy", "extra-rounded"];
const ECS: { id: ECLevel; hint: string }[] = [
  { id: "L", hint: "7%" }, { id: "M", hint: "15%" }, { id: "Q", hint: "25%" }, { id: "H", hint: "30%" },
];

interface Recent { id: string; type: QRType; content: Content; style: Style; data: string; at: number }
const RECENT_KEY = "qrpress.recent.v1";

export function QRGenerator() {
  const [type, setType] = useState<QRType>("url");
  const [content, setContent] = useState<Content>(defaultContent);
  const [style, setStyle] = useState<Style>(defaultStyle);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);
  const qr = useRef<QRCodeStyling | null>(null);

  const { data, error } = useMemo(() => buildPayload(type, content), [type, content]);
  const warnings = useMemo(() => readabilityWarnings(style), [style]);

  const options = useMemo(() => ({
    width: style.size,
    height: style.size,
    type: "canvas" as const,
    data: data || " ",
    margin: style.margin,
    qrOptions: { errorCorrectionLevel: style.ec },
    dotsOptions: style.gradient
      ? { type: style.dotType, gradient: { type: "linear" as const, rotation: Math.PI / 4, colorStops: [{ offset: 0, color: style.fg }, { offset: 1, color: style.fg2 }] } }
      : { type: style.dotType, color: style.fg },
    cornersSquareOptions: { color: style.fg },
    cornersDotOptions: { color: style.gradient ? style.fg2 : style.fg },
    backgroundOptions: { color: style.bg },
    image: style.logo ?? "",
    imageOptions: { margin: 6, imageSize: 0.3, hideBackgroundDots: true, crossOrigin: "anonymous" },
  }), [data, style]);

  // Browser-only library: load after mount
  useEffect(() => {
    let alive = true;
    import("qr-code-styling").then(({ default: QR }) => {
      if (!alive || !holder.current) return;
      qr.current = new QR(options);
      holder.current.innerHTML = "";
      qr.current.append(holder.current);
    });
    try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch { /* ignore */ }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { qr.current?.update(options); }, [options]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const set = <K extends keyof Content>(k: K, v: Content[K]) => setContent((c) => ({ ...c, [k]: v }));
  const st = <K extends keyof Style>(k: K, v: Style[K]) => setStyle((s) => ({ ...s, [k]: v }));

  const saveRecent = () => {
    const entry: Recent = { id: crypto.randomUUID(), type, content, style, data, at: Date.now() };
    const next = [entry, ...recent.filter((r) => r.data !== data || r.type !== type)].slice(0, 8);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { flash("Couldn't save to history (storage full)."); }
  };

  const download = async (ext: "png" | "svg") => {
    if (!qr.current || error) return;
    if (ext === "svg") {
      const QR = (await import("qr-code-styling")).default;
      await new QR({ ...options, type: "svg" }).download({ name: "qr-code", extension: "svg" });
    } else {
      await qr.current.download({ name: "qr-code", extension: "png" });
    }
    saveRecent();
    flash(`Downloaded ${ext.toUpperCase()}`);
  };

  const copy = async () => {
    if (!qr.current || error) return;
    try {
      const blob = (await qr.current.getRawData("png")) as Blob;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      saveRecent();
      flash("Copied to clipboard");
    } catch { flash("Your browser blocked clipboard access."); }
  };

  const onLogo = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return flash("Please choose an image file.");
    if (f.size > 1024 * 1024) return flash("Logo must be under 1 MB.");
    const r = new FileReader();
    r.onload = () => setStyle((s) => ({ ...s, logo: r.result as string, ec: s.ec === "L" || s.ec === "M" ? "H" : s.ec }));
    r.readAsDataURL(f);
  };

  const restore = (r: Recent) => { setType(r.type); setContent(r.content); setStyle(r.style); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const removeRecent = (id: string) => {
    const next = recent.filter((r) => r.id !== id);
    setRecent(next); localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-end justify-between gap-4 border-b px-5 pb-5 pt-8">
        <div>
          <p className="label-mono">Browser-only · nothing leaves your device</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl">
            QR<span className="text-accent">/</span>Press
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-sm text-muted-foreground sm:block">
          Generate, style and export scannable QR codes in seconds.
        </p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_400px]">
        {/* Controls */}
        <div className="space-y-8">
          <Section n="01" title="Content">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.id} className="chip" data-active={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              {type === "url" && <Field label="Website URL"><input className="field" value={content.url} onChange={(e) => set("url", e.target.value)} placeholder="https://example.com" /></Field>}
              {type === "text" && <Field label={`Text · ${content.text.length}/1500`}><textarea className="field min-h-28" value={content.text} onChange={(e) => set("text", e.target.value)} placeholder="Any message…" /></Field>}
              {type === "email" && (<>
                <Field label="Email address"><input className="field" type="email" value={content.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@example.com" /></Field>
                <Field label="Subject (optional)"><input className="field" value={content.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
                <Field label="Message (optional)"><textarea className="field min-h-20" value={content.body} onChange={(e) => set("body", e.target.value)} /></Field>
              </>)}
              {type === "phone" && <Field label="Phone number"><input className="field" type="tel" value={content.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></Field>}
              {type === "wifi" && (<>
                <Field label="Network name (SSID)"><input className="field" value={content.ssid} onChange={(e) => set("ssid", e.target.value)} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Security">
                    <select className="field" value={content.security} onChange={(e) => set("security", e.target.value as Content["security"])}>
                      <option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">None</option>
                    </select>
                  </Field>
                  {content.security !== "nopass" && <Field label="Password"><input className="field" type="text" value={content.password} onChange={(e) => set("password", e.target.value)} /></Field>}
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={content.hidden} onChange={(e) => set("hidden", e.target.checked)} /> Hidden network</label>
              </>)}
              {error && <p role="alert" className="text-sm font-medium text-destructive">⚠ {error}</p>}
            </div>
          </Section>

          <Section n="02" title="Presets">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {presets.map((p) => (
                <button key={p.name} onClick={() => setStyle((s) => ({ ...s, ...p.style }))} className="rounded-md border bg-card p-2 text-left text-sm hover:border-foreground">
                  <div className="mb-2 h-8 rounded-sm border" style={{ background: p.style.gradient ? `linear-gradient(135deg, ${p.style.fg}, ${p.style.fg2})` : p.style.fg, outline: `4px solid ${p.style.bg}`, outlineOffset: -6 }} />
                  {p.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Presets are a starting point — tweak anything below.</p>
          </Section>

          <Section n="03" title="Style">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={`Size · ${style.size}px`}><input type="range" min={128} max={1024} step={16} value={style.size} onChange={(e) => st("size", +e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
              <Field label={`Margin · ${style.margin}px`}><input type="range" min={0} max={64} value={style.margin} onChange={(e) => st("margin", +e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
              <Color label="Foreground" value={style.fg} onChange={(v) => st("fg", v)} />
              <Color label="Background" value={style.bg} onChange={(v) => st("bg", v)} />
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={style.gradient} onChange={(e) => st("gradient", e.target.checked)} /> Gradient foreground</label>
                {style.gradient && <div className="mt-3 max-w-xs"><Color label="Gradient end" value={style.fg2} onChange={(v) => st("fg2", v)} /></div>}
              </div>
              <Field label="Error correction">
                <div className="flex gap-2">
                  {ECS.map((e) => (
                    <button key={e.id} className="chip font-mono" data-active={style.ec === e.id} onClick={() => st("ec", e.id)} title={`Recovers ${e.hint}`}>{e.id}</button>
                  ))}
                </div>
              </Field>
              <Field label="Pattern">
                <select className="field" value={style.dotType} onChange={(e) => st("dotType", e.target.value as DotType)}>
                  {DOTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Logo (optional)">
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={(e) => onLogo(e.target.files?.[0])} className="field text-xs" />
                  {style.logo && <button className="btn border text-sm" onClick={() => st("logo", null)}>Remove</button>}
                </div>
              </Field>
            </div>
            <button className="mt-4 text-sm text-muted-foreground underline" onClick={() => setStyle(defaultStyle)}>Reset style</button>
          </Section>
        </div>

        {/* Preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border bg-card p-5 shadow-[0_1px_0_var(--border),0_20px_40px_-20px_oklch(0.18_0.01_60/25%)]">
            <div className="flex items-center justify-between">
              <span className="label-mono">Live preview</span>
              <span className="label-mono">{style.size}×{style.size}</span>
            </div>
            <div className="relative mt-3 aspect-square overflow-hidden rounded-md border" style={{ background: style.bg }}>
              <div ref={holder} className="h-full w-full [&_canvas]:!h-full [&_canvas]:!w-full" />
              {error && <div className="absolute inset-0 grid place-items-center bg-card/85 p-6 text-center text-sm text-muted-foreground backdrop-blur-sm">Fix the input to see your code</div>}
            </div>

            {warnings.length > 0 && !error && (
              <ul className="mt-3 space-y-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
                {warnings.map((w) => <li key={w}>⚠ {w}</li>)}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn col-span-2 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!!error} onClick={() => download("png")}>Download PNG</button>
              <button className="btn border hover:bg-secondary" disabled={!!error} onClick={() => download("svg")}>SVG</button>
              <button className="btn border hover:bg-secondary" disabled={!!error} onClick={copy}>Copy</button>
            </div>
            {!error && <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground" title={data}>{data}</p>}
          </div>
        </aside>
      </main>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex items-baseline justify-between border-b pb-3">
          <h2 className="text-xl font-bold">Recent codes</h2>
          {recent.length > 0 && <button className="text-sm text-muted-foreground underline" onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}>Clear all</button>}
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Codes you download or copy appear here, saved on this device.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((r) => (
              <li key={r.id} className="group rounded-md border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="label-mono">{r.type}</span>
                  <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => removeRecent(r.id)} aria-label="Remove">✕</button>
                </div>
                <p className="mt-1 truncate font-mono text-xs">{r.data}</p>
                <button className="mt-3 w-full rounded-sm border py-1.5 text-sm hover:bg-secondary" onClick={() => restore(r)}>Reuse</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg">{toast}</div>}
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-sm text-accent">{n}</span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="label-mono mb-1.5 block">{label}</span>{children}</label>;
}
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border bg-card p-1" />
        <input className="field" value={value} onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onChange(e.target.value)} />
      </div>
    </Field>
  );
}

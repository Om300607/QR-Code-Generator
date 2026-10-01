# QR Forge

A free, privacy-first QR code generator that runs entirely in your browser. Create scannable codes for links, plain text, emails, phone numbers and Wi‑Fi networks, style them with colors, gradients and logos, and export as PNG or SVG — all without anything ever leaving your device.

## Features

- **Five QR types**
  - **URL** — validated website links
  - **Text** — any message up to 1,500 characters
  - **Email** — pre-fills the recipient, subject and body via `mailto:`
  - **Phone** — dials a number when scanned via `tel:`
  - **Wi‑Fi** — auto-connects phones to your network (WPA/WPA2/WPA3, WEP, or open), with support for hidden networks

- **Live preview** — the QR code re-renders instantly as you type or change settings

- **Full styling control**
  - Size (128–1024 px) and quiet-zone margin
  - Foreground and background colors, plus optional two-color gradient
  - Dot patterns: square, rounded, dots, classy, extra-rounded
  - Custom logo uploads (up to 1 MB), with error correction bumped automatically
  - Five ready-made presets (Classic, Ember, Ocean, Forest, Ink) as starting points

- **Scannability safeguards** — built-in warnings when a design choice could hurt scanning, such as:
  - Low contrast between code and background
  - Inverted colors (lighter code on darker background)
  - Too small a quiet zone or print size
  - A logo used with error correction too low to compensate

- **Error correction levels** — L (7%), M (15%), Q (25%) and H (30%) recovery

- **Export** — download as PNG or SVG, or copy the PNG straight to your clipboard

- **Recent codes** — your last 8 generated codes are saved locally so you can reuse or restore their settings anytime

## Privacy

Everything happens client-side. No account is required, no data is sent to any server, and history is stored only in your browser's local storage. Clearing "Recent codes" in the app (or your browser data) removes it permanently.

## Tech Stack

- **Framework** — TanStack Start (React 19) with file-based routing
- **Language** — TypeScript
- **QR engine** — [qr-code-styling](https://github.com/kozakdenys/qr-code-styling) for generation, styling and export
- **Styling** — Tailwind CSS v4 with a custom design-token theme
- **Build tool** — Vite 8

## Getting Started

Requires Node.js 18+.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The app runs at `http://localhost:8080` (dev server) by default.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint the codebase |
| `npm run format` | Format the codebase with Prettier |

## Project Structure

```
src/
├── components/qr/
│   ├── QRGenerator.tsx   # Main UI: content forms, style controls, preview, history
│   └── qr-utils.ts       # Payload builders, input validation, presets, readability checks
├── routes/
│   ├── __root.tsx        # App shell and global styles
│   └── index.tsx         # The generator page
└── styles.css            # Tailwind v4 theme and design tokens
```

## Deployment

This is a standard Vite-based project. `npm run build` produces a static production build you can host on Vercel, Netlify, Cloudflare or any platform that supports Node.js builds. When importing into Vercel, use `npm run build` as the build command and `dist` as the output directory.

## License

This project is provided as-is for personal and commercial use.

import { createFileRoute } from "@tanstack/react-router";
import { QRGenerator } from "@/components/qr/QRGenerator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QR Press — Free QR Code Generator & Designer" },
      { name: "description", content: "Create URL, text, email, phone and Wi‑Fi QR codes. Customize colors, gradients, logos and download PNG or SVG." },
      { property: "og:title", content: "QR Press — QR Code Generator & Designer" },
      { property: "og:description", content: "Design scannable QR codes in your browser and download them instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QRGenerator,
});

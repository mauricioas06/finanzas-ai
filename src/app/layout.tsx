import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "FINANZAS AI", template: "%s · FINANZAS AI" },
  description: "Tu CFO personal: organiza tu dinero, controla tus deudas y decide qué hacer con cada peso.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060a14" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
  ],
};

// Aplica el tema guardado antes de pintar, para evitar un parpadeo.
const themeScript = `try{if(localStorage.getItem('tema')==='claro'){document.documentElement.classList.remove('dark')}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-fg">{children}</body>
    </html>
  );
}

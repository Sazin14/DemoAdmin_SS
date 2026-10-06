import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcomMS Admin",
  description: "Manage your EcomMS store operations.",
};

const themeInit = `const t=localStorage.getItem('ecomms-admin-theme')||'system';const d=t==='system'?matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light':t;document.documentElement.dataset.theme=d`

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}

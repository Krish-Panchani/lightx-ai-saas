import "@/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "LightX AI - SaaS for analyzing GitHub repositories",
  description:
    "LightX AI is a SaaS for analyzing GitHub repositories using AI. It provides insights into the quality of the code, the health of the project, and the community around it.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${GeistSans.variable}`}>
        <body>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

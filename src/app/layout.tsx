import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Barbell Tracker",
  description:
    "Track your barbell workouts, log weights, and get percentage-based suggestions",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e0e0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#cafd00",
          colorBackground: "#201f1f",
          colorInputBackground: "#0e0e0e",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextOnPrimaryBackground: "#1a1a00",
          colorTextSecondary: "#adaaaa",
          colorNeutral: "#ffffff",
          borderRadius: "0px",
        },
        elements: {
          card: "bg-[#201f1f] shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
          headerTitle: "!text-white font-bold",
          headerSubtitle: "!text-[#adaaaa]",
          socialButtonsBlockButton: "bg-[#262626] border-[#494847] !text-white hover:bg-[#2c2c2c]",
          socialButtonsBlockButtonText: "!text-white",
          formFieldLabel: "!text-[#adaaaa]",
          formFieldInput: "bg-[#0e0e0e] border-[#494847] !text-white placeholder:text-[#777575]",
          formButtonPrimary: "bg-[#cafd00] !text-[#1a1a00] hover:bg-[#beee00] font-bold",
          footerActionText: "!text-[#adaaaa]",
          footerActionLink: "!text-[#cafd00] hover:!text-[#beee00]",
          dividerLine: "bg-[#494847]",
          dividerText: "!text-[#777575]",
          identityPreviewText: "!text-white",
          identityPreviewEditButton: "!text-[#cafd00]",
          formResendCodeLink: "!text-[#cafd00]",
          alertText: "!text-white",
        },
      }}
    >
      <html
        lang="en"
        className={`${spaceGrotesk.variable} ${inter.variable} dark h-full`}
      >
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-full flex flex-col bg-background text-on-surface font-body antialiased selection:bg-primary-container selection:text-on-primary-fixed">
          {children}
          <Toaster
            toastOptions={{
              style: {
                background: "#201f1f",
                color: "#ffffff",
                border: "none",
                borderRadius: "0px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}

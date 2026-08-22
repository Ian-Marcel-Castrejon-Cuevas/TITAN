import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/hooks/useAuth";
import { NotificationProvider } from "@/context/NotificationContext";
import SecurityWrapper from "@/components/SecurityWrapper";

const inter = Inter({ subsets: ["latin"] });
const securityWrapperEnabled =
  process.env.SECURITY_WRAPPER_ENABLED?.toLowerCase() !== "false";

export const metadata: Metadata = {
  title: "TITAN - Sistema de Tickets",
  description: "Sistema de gestión de tickets de soporte técnico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <link rel="preload" as="audio" href="/sonidos/NIVEL COMPLETO.mp3" />
        <link rel="preload" as="audio" href="/sonidos/CARRERITAS.mp3" />
      </head>
      <body className={`${inter.className} h-full`}>
        <AuthProvider>
          <NotificationProvider>
            {securityWrapperEnabled ? (
              <SecurityWrapper>{children}</SecurityWrapper>
            ) : (
              children
            )}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "rgba(30, 41, 59, 0.9)",
                  color: "white",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                },
                success: {
                  iconTheme: {
                    primary: "#22c55e",
                    secondary: "white",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "white",
                  },
                },
              }}
            />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

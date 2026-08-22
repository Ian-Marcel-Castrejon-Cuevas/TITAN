"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import toast from "react-hot-toast";

interface User {
  ch: string;
  nombre: string;
  departamento?: number;
  es_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (ch: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

function deleteAllCookies() {
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionPrompt, setSessionPrompt] = useState(false);
  const [promptSecondsLeft, setPromptSecondsLeft] = useState(600);

  const clearLocalSession = () => {
    localStorage.removeItem("cadnux_token");
    localStorage.removeItem("cadnux_user_ch");
    localStorage.removeItem("cadnux_nombre");
    localStorage.removeItem("cadnux_departamento");
    localStorage.removeItem("cadnux_es_admin");
    localStorage.removeItem("cadnux_login_time");
    deleteCookie("cadnux_token");
    deleteCookie("cadnux_es_admin");
    setUser(null);
  };

  const checkSession = async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) {
      clearLocalSession();
      window.location.href = "/login";
      return;
    }

    const data = await response.json();
    if (data.needsConfirmation && data.confirmationDeadline) {
      setPromptSecondsLeft(
        Math.max(0, Math.ceil((data.confirmationDeadline - Date.now()) / 1000)),
      );
      setSessionPrompt(true);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("cadnux_token");
    const userCH = localStorage.getItem("cadnux_user_ch");
    const userName = localStorage.getItem("cadnux_nombre");
    const userDepartamento = localStorage.getItem("cadnux_departamento");
    const userEsAdmin = localStorage.getItem("cadnux_es_admin") === "true";

    if (token && userCH) {
      setUser({
        ch: userCH,
        nombre: userName || userCH,
        departamento: userDepartamento ? parseInt(userDepartamento) : undefined,
        es_admin: userEsAdmin,
      });
      checkSession().catch(() => {
        clearLocalSession();
        window.location.href = "/login";
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      checkSession().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!sessionPrompt) return;
    const interval = window.setInterval(() => {
      setPromptSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval);
          clearLocalSession();
          window.location.href = "/login?reason=timeout";
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionPrompt]);

  const handleLogin = async (ch: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_ch: ch, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      localStorage.setItem("cadnux_token", data.token);
      localStorage.setItem("cadnux_user_ch", data.usuario_ch);
      localStorage.setItem("cadnux_nombre", data.nombre_completo);
      localStorage.setItem(
        "cadnux_departamento",
        data.departamento?.toString() || "",
      );
      localStorage.setItem("cadnux_es_admin", data.es_admin ? "true" : "false");
      localStorage.setItem("cadnux_login_time", new Date().toISOString());

      setCookie("cadnux_token", data.token, 7);
      setCookie("cadnux_es_admin", data.es_admin ? "true" : "false", 7);

      setUser({
        ch: data.usuario_ch,
        nombre: data.nombre_completo,
        departamento: data.departamento,
        es_admin: data.es_admin,
      });

      toast.success("¡Bienvenido!");

      if (data.es_admin) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/tickets";
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al iniciar sesión",
      );
      throw error;
    }
  };

  const logout = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(
      () => undefined,
    );
    clearLocalSession();

    if (sessionStorage) {
      sessionStorage.clear();
    }

    deleteAllCookies();
    window.location.href = "/login";

    toast.success("Sesión cerrada");
  };

  const isAdmin = user?.es_admin === true;

  const confirmSession = async () => {
    const response = await fetch("/api/auth/session", { method: "POST" });
    if (!response.ok) {
      clearLocalSession();
      window.location.href = "/login";
      return;
    }
    setSessionPrompt(false);
    setPromptSecondsLeft(600);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin, login: handleLogin, logout }}
    >
      {children}
      {sessionPrompt && user && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="glass-card w-full max-w-md p-6 text-center">
            <h2 className="text-xl font-bold text-white">¿Sigues en línea?</h2>
            <p className="mt-2 text-white/60">
              Confirma para mantener tu sesión activa. Se cerrará en{" "}
              {Math.floor(promptSecondsLeft / 60)}:
              {String(promptSecondsLeft % 60).padStart(2, "0")}.
            </p>
            <button
              onClick={confirmSession}
              className="btn-primary mt-6 w-full"
            >
              Sí, continuar conectado
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.8.87:3001";

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
  const router = useRouter();

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
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (ch: string, password: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
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
    localStorage.clear();

    if (sessionStorage) {
      sessionStorage.clear();
    }

    deleteAllCookies();
    deleteCookie("cadnux_token");
    deleteCookie("cadnux_es_admin");

    setUser(null);

    window.location.href = "/login";

    toast.success("Sesión cerrada");
  };

  const isAdmin = user?.es_admin === true;

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin, login: handleLogin, logout }}
    >
      {children}
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

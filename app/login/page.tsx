"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { Headset, User, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [ch, setCh] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const specialUsers = [
    "DEMO01",
    "DEMOADMIN",
    "MVELAZQUEZ3",
    "FGONZALEZ",
    "JALONSO",
    "JVAZQUEZ",
    "CAP13",
    "ASECON",
    "OTROPS",
    "17644",
    "ASECON16",
    "RJUANICO",
    "CAP12",
    "ASECON22",
    "MVELAZQUEZ2",
    "ASECON25",
    "USER06944",
    "CAP10",
    "JGUERRERO",
    "CAP02",
    "CAP08",
    "DIANAJUR",
    "EQG",
    "LGARCIA",
    "ASECON8",
    "FUGARTE",
    "EQG01",
    "LDAVILAH",
    "ASECON7",
    "ASECON10",
    "CAP14",
    "ASECON9",
    "ASECON24",
    "HYSANCHEZ1",
    "CROJAS",
    "CAP01",
    "ASECON4",
    "ASECON2",
    "JCAMPO",
    "JPAZOS",
    "ASECON21",
    "ASECON6",
    "APAZOS",
    "HYSANCHEZ2",
    "USER07269",
    "ASECON14",
    "MVELAZQUEZ4",
    "CAP11",
    "JJINFANTE1",
    "ASECON17",
    "GRODRIGUEZ",
    "ASECON23",
    "ASECON18",
    "ATINO",
    "MASANCHEZ1",
    "JJIMENEZ",
    "CAP03",
    "ASECON13",
    "CSERRALDEA",
    "CAP06",
    "EQG02",
    "CAP07",
    "ASECON3",
    "CPAZOS",
    "CAP05",
    "AMALIAG",
    "ASECON12",
    "AMARTINEZ",
    "MVELAZQUEZ1",
    "ASECON20",
    "MASANCHEZ2",
    "ASECON1",
    "CAP04",
    "ASECON5",
    "ASECON11",
    "JJINFANTE2",
    "ASECON15",
    "MSANCHEZ",
    "ASECON19",
    "CAP15",
  ];

  const isValidUserFormat = (username: string): boolean => {
    if (!username) return false;

    if (specialUsers.includes(username)) return true;

    const chPattern = /^CH\d{5}$/i;
    return chPattern.test(username);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidUserFormat(ch)) {
      alert("Formato inválido. Use CH12345 o un usuario autorizado");
      return;
    }

    setIsLoading(true);
    try {
      await login(ch, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setCh(value);
  };

  const fillDemoCredentials = () => {
    setCh("DEMO01");
    setPassword("demo1234");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-500/20 rounded-full blur-3xl animate-pulse-glow" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="glass-card p-8 animate-fade-in">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl blur-xl opacity-50 animate-pulse-glow" />
                <div className="relative w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Headset className="w-10 h-10 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                TITAN
              </h1>
              <p className="text-white/50 mt-2">
                TICKETING AND INCIDENT TRACKING ADMINISTRATION NETWORK
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="form-label">
                  <User className="w-4 h-4" />
                  Usuario
                </label>
                <input
                  type="text"
                  value={ch}
                  onChange={handleUserChange}
                  placeholder={
                    specialUsers.includes(ch)
                      ? "Usuario autorizado"
                      : "Ej: CH12345"
                  }
                  className="form-input"
                  required
                />
                {ch && !isValidUserFormat(ch) && (
                  <p className="text-xs text-red-400 mt-1">
                    Formato inválido. Use CH12345 o un usuario autorizado
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="form-input pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || (!!ch && !isValidUserFormat(ch))}
                className="btn-primary w-full flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Ingresando...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full text-sm text-primary-300 transition-colors hover:text-primary-200"
              >
                Usar acceso de demostración
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

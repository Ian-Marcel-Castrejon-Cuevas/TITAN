"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  User,
  Building2,
  Briefcase,
  FileText,
  AlertCircle,
  Zap,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const DEPARTAMENTOS: Record<number, string> = {
  1: "Dirección General",
  2: "Coordinación General",
  3: "Recuperación",
  4: "Administración",
  5: "Contabilidad",
  6: "Jurídico",
  7: "Captura",
  8: "Gestores Externos",
  9: "Sistemas",
  10: "Sucursales",
  11: "ARQUITECTURA",
  12: "AT&T",
  13: "AUDITORIA INTERNA",
  14: "BBVA",
  15: "Capacitación",
  16: "CITIBANAMEX",
  17: "COMPRAS",
  18: "COMUNICACION",
  19: "GM FINANCIAL",
  20: "GM FINANCIAL LEGAL",
  21: "INFONAVIT CAMPECHE",
  22: "INFONAVIT CANCUN",
  23: "INFONAVIT CDMX",
  24: "INFONAVIT CELAYA",
  25: "INFONAVIT CHETUMAL",
  26: "INFONAVIT GARCIA",
  27: "INFONAVIT IRAPUATO",
  28: "INFONAVIT LEON",
  29: "INFONAVIT MONTERREY",
  30: "INFONAVIT NUEVO LAREDO",
  31: "INFONAVIT NUEVO LEON",
  32: "INFONAVIT PLAYA DEL CARMEN",
  33: "INFONAVIT REYNOSA",
  34: "INFONAVIT TAMPICO",
  35: "MONITOREO Y CALIDAD",
  36: "RECURSOS HUMANOS",
  37: "SERVICIOS INTERNOS",
  38: "SUCURSAL CANCUN",
  39: "SUCURSAL CDMX",
  40: "SUCURSAL CHIAPAS",
  41: "SUCURSAL CHIHUAHUA",
  42: "SUCURSAL COLIMA",
  43: "SUCURSAL CULIACAN",
  44: "SUCURSAL GUADALAJARA",
  45: "SUCURSAL HERMOSILLO",
  46: "SUCURSAL LEON",
  47: "SUCURSAL MEXICALI",
  48: "SUCURSAL MONTERREY",
  49: "SUCURSAL MORELIA",
  50: "SUCURSAL OAXACA",
  51: "SUCURSAL PUEBLA",
  52: "SUCURSAL VERACRUZ",
  53: "TOYOTA",
  54: "VOLKSWAGEN (LEGAL)",
  55: "INFONAVIT CHIHUAHUA",
  56: "SCOTIABANK",
  57: "SEGURIDAD DE LA INFORMACIÓN",
  58: "Capacitación",
};

const specialUsers = [
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

const plataformas = [
  "Active Directory (AD)",
  "Problema con el equipo",
  "Carven",
  "Nuxiba Host",
  "Nuxiba Sitio",
  "Intranet",
  "Cyber",
  "Ccc Uno",
  "Otro",
];

const motivosActiveDirectory = [
  "Bloqueo de usuario",
  "Cuenta sin Aplicativos",
  "Restablecimiento de Contraseña",
  "Usuario Deshabilitado",
  "Cambio de Cartera",
  "Equipo Deshabilitado",
  "Corrección de Datos",
  "Alta de usuario o validación",
  "Otros",
];

const motivosProblemaEquipo = [
  "Movimiento de Equipo",
  "Equipo Congelado",
  "Problemas con Audio",
  "Problemas con Software",
  "Equipo lento",
  "Equipo sin Red",
  "Solicitud Consumible",
  "Reacomodo de Cableado",
  "Fallas en Monitor o proyección",
  "Problemas con Cableado",
  "Otros",
];

const motivosCarven = [
  "Botar Carven",
  "Cambio de contraseña",
  "Desbloqueo de Carven",
  "Asignar producto",
  "Quitar producto",
  "Agregar lista de trabajo individual",
  "Levantar carven 1",
  "Levantar carven 2",
  "Levantar carven 3",
  "Otros",
];

const motivosNuxibaHost = [
  "Cambio de contraseña",
  "Reasignación de grupo",
  "Asignación manual",
  "Autorización de transferencia",
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const motivosNuxibaSitio = [
  "Cambio de contraseña",
  "Reasignación de grupo",
  "Asignación manual",
  "Autorización de transferencia",
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const motivosIntranet = [
  "Asignar cartera",
  "Borrar publicación",
  "Error de página",
  "Otros",
];

const motivosCyber = ["Sin Acceso", "Otros"];

const motivosCCC = [
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const getMotivosPorPlataforma = (plataforma: string): string[] => {
  switch (plataforma) {
    case "Active Directory (AD)":
      return motivosActiveDirectory;
    case "Problema con el equipo":
      return motivosProblemaEquipo;
    case "Carven":
      return motivosCarven;
    case "Nuxiba Host":
      return motivosNuxibaHost;
    case "Nuxiba Sitio":
      return motivosNuxibaSitio;
    case "Intranet":
      return motivosIntranet;
    case "Cyber":
      return motivosCyber;
    case "Ccc Uno":
      return motivosCCC;
    default:
      return ["Otro"];
  }
};

const puestos = [
  "GERENTE",
  "SUPERVISOR",
  "EJECUTIVO",
  "OPERADOR",
  "ADMINISTRADOR",
  "CAPTURISTA",
  "ABOGADO",
  "CAPACITACION",
  "COORDINADOR JURIDICO",
  "AUXILIAR JURIDICO",
  "GERENTE DE RECURSOS HUMANOS",
  "COORDINADOR DE RECURSOS HUMANOS",
  "AUXILIAR RECUPERACION",
  "COORDINADOR GESTORES EXTERNOS",
  "COORDINADOR CALIDAD",
  "MONITOR CALIDAD",
  "GERENTE RECUPERACION",
  "OTRO",
];

async function ejecutarBorrarCarven() {
  try {
    await fetch("/api/delete-carven", { method: "POST" });
  } catch (error) {
    console.error("Error en BOTAR CARVEN:", error);
  }
}

const isValidCHOrSpecialUser = (username: string): boolean => {
  if (!username) return false;
  if (specialUsers.includes(username)) return true;
  return /^CH\d{5}$/i.test(username);
};

async function buscarUsuarioPorCH(
  ch: string,
): Promise<{ nombre: string; existe: boolean }> {
  if (specialUsers.includes(ch)) {
    return { nombre: ch, existe: true };
  }

  if (!isValidCHOrSpecialUser(ch)) {
    return { nombre: "", existe: false };
  }

  try {
    const response = await fetch(`/api/buscar-usuario?ch=${ch.toUpperCase()}`);
    const data = await response.json();
    if (data.success && data.usuario) {
      const nombreCompleto = (data.usuario.nombre_completo || "")
        .replace(/\s+/g, " ")
        .trim();
      return { nombre: nombreCompleto, existe: true };
    }
    return { nombre: "", existe: false };
  } catch (error) {
    console.error("Error buscando usuario:", error);
    return { nombre: "", existe: false };
  }
}

const isValidNodo = (nodo: string): boolean => {
  if (!nodo) return false;
  const nodoNum = parseInt(nodo, 10);
  if (isNaN(nodoNum)) return false;
  return nodoNum >= 2000 && nodoNum <= 2400;
};

export default function RegistroPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [buscandoUsuario, setBuscandoUsuario] = useState(false);
  const [chError, setChError] = useState("");
  const [nodoError, setNodoError] = useState("");
  const [canSubmit, setCanSubmit] = useState(true);
  const [formData, setFormData] = useState({
    ch: "",
    nombre: "",
    nodo: "",
    cartera: "",
    plataforma: "",
    motivo: "",
    puesto: "",
    descripcion: "",
  });

  const [motivosDisponibles, setMotivosDisponibles] = useState<string[]>([]);

  useEffect(() => {
    if (user?.departamento) {
      const carteraValue =
        DEPARTAMENTOS[user.departamento] || `Departamento ${user.departamento}`;
      setFormData((prev) => ({ ...prev, cartera: carteraValue }));
    }
  }, [user?.departamento]);

  useEffect(() => {
    const nuevosMotivos = getMotivosPorPlataforma(formData.plataforma);
    setMotivosDisponibles(nuevosMotivos);
    if (formData.motivo) {
      setFormData((prev) => ({ ...prev, motivo: "" }));
    }
  }, [formData.plataforma]);

  useEffect(() => {
    const buscarUsuario = async () => {
      if (formData.ch && isValidCHOrSpecialUser(formData.ch)) {
        setBuscandoUsuario(true);
        setChError("");
        const { nombre, existe } = await buscarUsuarioPorCH(formData.ch);
        if (existe && nombre) {
          setFormData((prev) => ({ ...prev, nombre: nombre }));
          setChError("");
        } else if (!existe) {
          setFormData((prev) => ({ ...prev, nombre: "" }));
          setChError("Usuario no encontrado en el sistema");
        }
        setBuscandoUsuario(false);
      } else if (formData.ch && !isValidCHOrSpecialUser(formData.ch)) {
        setFormData((prev) => ({ ...prev, nombre: "" }));
        setChError(
          "Formato incorrecto. Use CH seguido de 5 dígitos (ej: CH12345) o un usuario autorizado",
        );
      } else {
        setChError("");
      }
    };

    const timer = setTimeout(buscarUsuario, 500);
    return () => clearTimeout(timer);
  }, [formData.ch]);

  useEffect(() => {
    if (formData.nodo) {
      if (!isValidNodo(formData.nodo)) {
        setNodoError("El nodo debe ser un número entre 2000 y 2400");
      } else {
        setNodoError("");
      }
    } else {
      setNodoError("");
    }
  }, [formData.nodo]);

  useEffect(() => {
    if (currentStep === 3) {
      setCanSubmit(false);
      const timer = setTimeout(() => {
        setCanSubmit(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setCanSubmit(true);
    }
  }, [currentStep]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    updateField("ch", value);
  };

  const handleNodoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      updateField("nodo", value);
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.ch || !isValidCHOrSpecialUser(formData.ch)) {
        toast.error(
          "Ingrese un CH válido (CH + 5 dígitos) o un usuario autorizado",
        );
        return false;
      }
      if (!formData.nombre) {
        toast.error("Usuario no encontrado en el sistema");
        return false;
      }
      if (!formData.nodo) {
        toast.error("Por favor completa el campo Nodo");
        return false;
      }
      if (!isValidNodo(formData.nodo)) {
        toast.error("El nodo debe ser un número entre 2000 y 2400");
        return false;
      }
    } else if (currentStep === 2) {
      if (!formData.cartera || !formData.plataforma || !formData.puesto) {
        toast.error("Por favor completa todos los campos");
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.motivo || !formData.descripcion) {
        toast.error("Por favor completa todos los campos");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== 3) {
      return;
    }

    if (!validateStep()) return;

    setLoading(true);

    try {
      if (formData.motivo === "Botar Carven") {
        await ejecutarBorrarCarven();
      }

      const ticketData = {
        ...formData,
        creado_por: user?.ch || formData.ch,
      };

      const response = await api.createTicket(ticketData);
      setTicketId(response.ticketCode);

      if (formData.motivo === "Botar Carven") {
        await api.changeStatus(response.ticketCode, "cerrado");
      }

      setSuccess(true);
      toast.success("¡Ticket registrado exitosamente!", {
        icon: "🎉",
        duration: 3000,
      });

      setTimeout(() => {
        router.push("/tickets");
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar ticket");
      setLoading(false);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Datos Personales",
      icon: User,
      description: "Información básica",
    },
    {
      number: 2,
      title: "Información Laboral",
      icon: Briefcase,
      description: "Datos de trabajo",
    },
    {
      number: 3,
      title: "Detalle del Problema",
      icon: FileText,
      description: "Describe tu issue",
    },
  ];

  const getDepartamentoActual = () => {
    if (user?.departamento) {
      return (
        DEPARTAMENTOS[user.departamento] || `Departamento ${user.departamento}`
      );
    }
    return "Cargando...";
  };

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 ml-72 overflow-y-auto">
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg mb-4 animate-float">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Nuevo Ticket de Soporte
              </h1>
              <p className="text-white/50 mt-2">
                Registra tu solicitud de manera rápida y sencilla
              </p>
              {user?.departamento && (
                <p className="text-primary-400 text-sm mt-2">
                  Cartera asignada: {getDepartamentoActual()}
                </p>
              )}
            </div>

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-400 font-semibold">
                      ¡Ticket registrado exitosamente!
                    </p>
                    <p className="text-green-400/70 text-sm mt-1">
                      ID de seguimiento:{" "}
                      <span className="font-mono">{ticketId}</span>
                    </p>
                    <p className="text-green-400/50 text-xs mt-1">
                      Redirigiendo a mis tickets...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Steps Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex-1 relative">
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${
                          currentStep >= step.number
                            ? "bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25"
                            : "bg-slate-700"
                        }`}
                      >
                        {currentStep > step.number ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <step.icon className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="text-center mt-3">
                      <p
                        className={`text-sm font-medium ${currentStep >= step.number ? "text-white" : "text-white/40"}`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-white/30 mt-1 hidden md:block">
                        {step.description}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`absolute top-5 left-1/2 w-full h-0.5 transition-all duration-300 ${
                          currentStep > step.number
                            ? "bg-primary-500"
                            : "bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-card p-8">
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">
                        <User className="w-4 h-4" />
                        Usuario Afectado
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.ch}
                          onChange={handleCHChange}
                          placeholder="Ej: CH12345 o usuario autorizado"
                          className={`form-input ${chError ? "border-red-500 focus:border-red-500" : ""}`}
                          required
                        />
                        {buscandoUsuario && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                          </div>
                        )}
                      </div>
                      {chError && (
                        <p className="text-red-400 text-xs mt-1">{chError}</p>
                      )}
                      <p className="text-white/30 text-xs mt-1">
                        * Ingrese CH con formato CH + 5 dígitos o un usuario
                        autorizado
                      </p>
                    </div>

                    <div>
                      <label className="form-label">
                        <User className="w-4 h-4" />
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        placeholder="Se completa automáticamente"
                        className="form-input bg-slate-700/50 cursor-not-allowed opacity-80 font-medium"
                        disabled
                      />
                      {formData.nombre && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <p className="text-green-400 text-xs">
                            ✓{" "}
                            {specialUsers.includes(formData.ch)
                              ? "Usuario autorizado verificado"
                              : "Usuario encontrado en el sistema"}
                          </p>
                        </div>
                      )}
                      <p className="text-white/30 text-xs mt-1">
                        * Se completa automáticamente al ingresar el usuario
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      <Building2 className="w-4 h-4" />
                      Nodo
                    </label>
                    <input
                      type="text"
                      value={formData.nodo}
                      onChange={handleNodoChange}
                      placeholder="Nodo entre 2000 y 2400"
                      className={`form-input ${nodoError ? "border-red-500 focus:border-red-500" : ""}`}
                      required
                    />
                    {nodoError ? (
                      <p className="text-red-400 text-xs mt-1">{nodoError}</p>
                    ) : (
                      <p className="text-white/30 text-xs mt-1">
                        * El nodo debe ser un número entre 2000 y 2400
                      </p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <label className="form-label">
                      <Building2 className="w-4 h-4" />
                      Cartera / Departamento
                    </label>
                    <input
                      type="text"
                      value={formData.cartera}
                      disabled
                      className="form-input bg-slate-700/50 cursor-not-allowed opacity-80"
                    />
                    <p className="text-white/30 text-xs mt-1">
                      * Se asigna automáticamente según tu perfil
                    </p>
                  </div>

                  <CustomDropdown
                    label="Plataforma"
                    options={plataformas}
                    value={formData.plataforma}
                    onChange={(value) => updateField("plataforma", value)}
                    icon={<Briefcase className="w-4 h-4" />}
                  />

                  <CustomDropdown
                    label="Puesto"
                    options={puestos}
                    value={formData.puesto}
                    onChange={(value) => updateField("puesto", value)}
                    icon={<Briefcase className="w-4 h-4" />}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <CustomDropdown
                    label="Motivo"
                    options={motivosDisponibles}
                    value={formData.motivo}
                    onChange={(value) => updateField("motivo", value)}
                    icon={<AlertCircle className="w-4 h-4" />}
                  />

                  <div>
                    <label className="form-label">
                      <FileText className="w-4 h-4" />
                      Descripción del Problema
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) =>
                        updateField("descripcion", e.target.value)
                      }
                      rows={6}
                      placeholder="Describe a detalle el problema que estás presentando..."
                      className="form-input resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                )}

                <div className="flex gap-3 ml-auto">
                  {currentStep < 3 && (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={loading}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={loading || currentStep !== 3 || !canSubmit}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        Registrar Ticket
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}

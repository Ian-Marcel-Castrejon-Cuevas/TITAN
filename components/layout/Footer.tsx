"use client";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/10 py-4 mt-auto bg-gradient-to-b from-slate-900/95 to-slate-900/98">
      <div className="w-full px-4">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-center">
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <span className="text-white/40 text-sm">Creado por</span>
            <span className="text-primary-400 font-medium">IAN</span>
          </div>
          <span className="text-white/30 text-sm hidden sm:block">•</span>
          <p className="text-white/40 text-sm">
            Todos los derechos reservados {currentYear}
          </p>
        </div>
      </div>
    </footer>
  );
}

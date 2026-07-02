'use client';

import React, { useState } from 'react';
import { useTheme, TournamentConfig } from '@/context/ThemeContext';
import { Palette, Upload, Check, Settings2 } from 'lucide-react';

const PRESET_THEMES: { name: string; config: TournamentConfig }[] = [
  {
    name: "Kings Cup - Césped Neón",
    config: {
      tournamentName: "Kings Cup F7",
      sport: "Fútbol 7",
      logoUrl: "👑",
      theme: {
        primaryColor: "#ccff00", // Amarillo/Verde Césped Neón
        secondaryColor: "#ff0055", // Magenta Eléctrico
        backgroundColor: "#050508", // Oscuro absoluto
        textColor: "#ffffff",
        cardBackgroundColor: "#0d0e15",
        fontFamilyHeader: "var(--font-oswald)",
        fontFamilyData: "var(--font-roboto-mono)",
      }
    }
  },
  {
    name: "DAZN Style - Oro y Carbono",
    config: {
      tournamentName: "DAZN Championship",
      sport: "Fútbol 7",
      logoUrl: "⚽",
      theme: {
        primaryColor: "#facc15", // Amarillo DAZN
        secondaryColor: "#38bdf8", // Celeste eléctrico
        backgroundColor: "#09090b", // Negro mate
        textColor: "#f4f4f5",
        cardBackgroundColor: "#18181b", // Gris carbón
        fontFamilyHeader: "var(--font-oswald)",
        fontFamilyData: "var(--font-roboto-mono)",
      }
    }
  },
  {
    name: "Winamax - Rojo Asfalto",
    config: {
      tournamentName: "Winamax Poker Cup",
      sport: "Pádel",
      logoUrl: "🃏",
      theme: {
        primaryColor: "#ef4444", // Rojo Winamax
        secondaryColor: "#10b981", // Verde casino
        backgroundColor: "#090505", // Negro rojizo
        textColor: "#f3f4f6",
        cardBackgroundColor: "#180d0d", // Carbón rojizo
        fontFamilyHeader: "var(--font-oswald)",
        fontFamilyData: "var(--font-roboto-mono)",
      }
    }
  },
  {
    name: "Cyber Arena - Cian y Violeta",
    config: {
      tournamentName: "Cyber Arena F7",
      sport: "Fútbol 7",
      logoUrl: "⚡",
      theme: {
        primaryColor: "#00f0ff", // Cian Cyber
        secondaryColor: "#d946ef", // Violeta Cyber
        backgroundColor: "#040206", // Espacial
        textColor: "#f1f5f9",
        cardBackgroundColor: "#100b1a", // Noche oscura
        fontFamilyHeader: "var(--font-oswald)",
        fontFamilyData: "var(--font-roboto-mono)",
      }
    }
  }
];

export default function ThemeSelector() {
  const { config, setTournamentConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState(JSON.stringify(config, null, 2));
  const [error, setError] = useState("");

  const handleApplyPreset = (preset: TournamentConfig) => {
    setTournamentConfig(preset);
    setJsonInput(JSON.stringify(preset, null, 2));
    setError("");
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.tournamentName || !parsed.theme || !parsed.theme.primaryColor) {
        throw new Error("El JSON debe contener 'tournamentName', 'sport' y un objeto 'theme' con 'primaryColor'.");
      }
      setTournamentConfig(parsed);
      setError("");
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "JSON inválido. Revisa la sintaxis.");
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/5 backdrop-blur-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary animate-pulse" />
          <h2 className="font-header font-black text-sm uppercase tracking-wider text-slate-200">Motor Temático Integrado</h2>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
          {isOpen ? "Cerrar Editor" : "Abrir Editor JSON"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {PRESET_THEMES.map((theme, i) => {
          const isActive = config.tournamentName === theme.config.tournamentName;
          return (
            <button
              key={i}
              onClick={() => handleApplyPreset(theme.config)}
              className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl border font-header font-black uppercase transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary-color-rgb),0.15)]'
                  : 'border-white/5 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-white/10'
              }`}
            >
              <span className="text-sm">{theme.config.logoUrl}</span>
              <span>{theme.name}</span>
              {isActive && <Check className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div className="mt-5 pt-5 border-t border-white/10 transition-all duration-300">
          <p className="text-[10px] uppercase tracking-wider font-header font-black text-slate-500 mb-2">
            Configuración Personalizada en Tiempo Real (JSON)
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={JSON.stringify(PRESET_THEMES[0].config, null, 2)}
            className="w-full h-44 text-xs font-mono p-4 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-350 placeholder-slate-600 shadow-inner"
          />
          {error && <p className="text-xs text-red-400 font-semibold mt-1">⚠️ {error}</p>}
          <button
            onClick={handleApplyJson}
            className="mt-3 w-full flex items-center justify-center gap-2 text-xs py-3 bg-primary hover:brightness-110 text-slate-950 font-header font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Compilar y Aplicar Skin
          </button>
        </div>
      )}
    </div>
  );
}

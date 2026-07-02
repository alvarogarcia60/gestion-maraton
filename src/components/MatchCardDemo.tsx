'use client';

import React from 'react';
import { Calendar, Shield, Activity } from 'lucide-react';

interface MatchCardDemoProps {
  homeTeam?: { name: string; logo: string; score: number };
  awayTeam?: { name: string; logo: string; score: number };
  roundName?: string;
  time?: string;
  isLive?: boolean;
}

export default function MatchCardDemo({
  homeTeam = { name: "PIO FC", logo: "🐥", score: 3 },
  awayTeam = { name: "1K FC", logo: "⚔️", score: 2 },
  roundName = "JORNADA 5",
  time = "21:00h",
  isLive = true
}: MatchCardDemoProps) {
  const homeWins = homeTeam.score > awayTeam.score;
  const awayWins = awayTeam.score > homeTeam.score;

  return (
    <div className="w-full max-w-sm font-sans">
      {/* Contenedor Principal de la Tarjeta */}
      <div className="relative group overflow-hidden rounded-2xl bg-theme-card border border-white/5 hover:border-primary/40 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300">
        
        {/* Glow de fondo que reacciona al hover de la tarjeta */}
        <div className="absolute -inset-px bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none" />

        {/* Encabezado del Partido */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="font-header font-black text-xs tracking-wider text-slate-400">
              {roundName}
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-650" />
            <span className="font-data text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-secondary" />
              SÁBADO
            </span>
          </div>

          {/* Indicador EN DIRECTO (Live Badge) */}
          {isLive ? (
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/25 px-2 py-0.5 rounded-full animate-pulse">
              <Activity className="w-3.5 h-3.5 fill-current" />
              EN VIVO
            </span>
          ) : (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full">
              {time}
            </span>
          )}
        </div>

        {/* Cuerpo del Partido (Cara a Cara) */}
        <div className="p-5 flex flex-col gap-4 relative z-10">
          
          {/* Fila Equipo Local */}
          <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
            homeWins 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary shadow-[0_0_20px_rgba(var(--primary-color-rgb),0.05)]' 
              : 'bg-white/[0.01] border-l-4 border-transparent'
          }`}>
            <div className="flex items-center gap-3 truncate w-9/12">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-lg shadow-inner">
                {homeTeam.logo}
              </div>
              <span className={`font-header font-black text-base uppercase tracking-tight ${
                homeWins ? 'text-white' : 'text-slate-400'
              }`}>
                {homeTeam.name}
              </span>
            </div>
            <span className={`font-data font-black text-2xl tracking-tighter ${
              homeWins ? 'text-primary' : 'text-slate-500'
            }`}>
              {homeTeam.score}
            </span>
          </div>

          {/* Fila Equipo Visitante */}
          <div className={`flex items-center justify-between p-3 rounded-xl transition-all ${
            awayWins 
              ? 'bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary shadow-[0_0_20px_rgba(var(--primary-color-rgb),0.05)]' 
              : 'bg-white/[0.01] border-l-4 border-transparent'
          }`}>
            <div className="flex items-center gap-3 truncate w-9/12">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center text-lg shadow-inner">
                {awayTeam.logo}
              </div>
              <span className={`font-header font-black text-base uppercase tracking-tight ${
                awayWins ? 'text-white' : 'text-slate-400'
              }`}>
                {awayTeam.name}
              </span>
            </div>
            <span className={`font-data font-black text-2xl tracking-tighter ${
              awayWins ? 'text-primary' : 'text-slate-500'
            }`}>
              {awayTeam.score}
            </span>
          </div>

        </div>

        {/* Pie de la Tarjeta / Botón de Acción */}
        <div className="px-5 pb-5 pt-1 relative z-10">
          <button className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-slate-950 font-header font-black text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 border border-white/10 cursor-pointer">
            ESTADÍSTICAS DEL PARTIDO
          </button>
        </div>

      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import ExportButton from './ExportButton';
import { Shield, Users, FileText, Settings } from 'lucide-react';

export default function RegistrationForm() {
  const { config } = useTheme();
  const formRef = useRef<HTMLDivElement>(null);

  // Estados dinámicos vinculados al panel de configuración rápida
  const [tournamentName, setTournamentName] = useState("COPA DE CAMPEONES FÚTBOL 7");
  const [secondaryText, setSecondaryText] = useState("FICHA OFICIAL DE INSCRIPCIÓN");
  const [numPlayers, setNumPlayers] = useState(12);

  // Crear array dinámico basado en el número de jugadores configurados
  const rows = Array.from({ length: Math.max(1, numPlayers) }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[210mm]">
      
      {/* Panel de Configuración Rápida (Oculto al imprimir: print:hidden) */}
      <div className="w-full bg-zinc-900 border border-zinc-800 p-5 rounded-none flex flex-wrap gap-4 items-end no-print shadow-xl">
        <div className="flex items-center gap-2 w-full border-b border-zinc-800 pb-2 mb-2">
          <Settings className="w-4 h-4 text-yellow-400" />
          <span className="font-header font-black text-xs uppercase tracking-wider text-zinc-300">Editor del Documento (Ficha)</span>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="font-header font-black text-[10px] uppercase text-zinc-550 tracking-wider">Nombre del Torneo</label>
          <input 
            type="text" 
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            className="h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-none text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="font-header font-black text-[10px] uppercase text-zinc-550 tracking-wider">Texto Secundario / Cabecera</label>
          <input 
            type="text" 
            value={secondaryText}
            onChange={(e) => setSecondaryText(e.target.value)}
            className="h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-none text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 w-24">
          <label className="font-header font-black text-[10px] uppercase text-zinc-550 tracking-wider">Filas (Jugadores)</label>
          <input 
            type="number" 
            min="1"
            max="25"
            value={numPlayers}
            onChange={(e) => setNumPlayers(parseInt(e.target.value, 10) || 1)}
            className="h-9 px-3 bg-zinc-950 border border-zinc-800 rounded-none text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Botones de control superiores (no se imprimen) */}
      <div className="flex justify-between items-center w-full no-print px-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-yellow-400" />
          <h2 className="font-header font-black text-sm uppercase tracking-wider text-zinc-300">Vista Previa de Impresión</h2>
        </div>
        <ExportButton 
          elementRef={formRef} 
          fileName={`Ficha_Inscripcion_${tournamentName.replace(/\s+/g, '_')}`} 
          backgroundColor="#ffffff"
        />
      </div>

      {/* Contenedor del Folio A4 (Imprimible: Fondo Blanco, Letras Negras, Sombra Brutal) */}
      <div 
        ref={formRef}
        className="printable-document w-[210mm] min-h-[297mm] p-12 bg-white text-zinc-900 shadow-[0_0_60px_rgba(0,0,0,0.65)] rounded-none flex flex-col justify-between border border-zinc-200 relative overflow-hidden"
      >
        {/* Decoración táctica de fondo sutil */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="50" y1="0" x2="50" y2="100" stroke="black" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="black" strokeWidth="0.5" />
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="black" strokeWidth="0.5" />
            <rect x="0" y="30" width="15" height="40" fill="none" stroke="black" strokeWidth="0.5" />
            <rect x="85" y="30" width="15" height="40" fill="none" stroke="black" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          {/* Encabezado */}
          <div className="flex items-center justify-between border-b-4 border-yellow-400 pb-5">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-zinc-950 text-white rounded-none flex items-center justify-center text-3xl border border-zinc-800 shadow-md">
                {config.logoUrl}
              </div>
              <div>
                <h1 className="font-header font-black text-3xl tracking-tight text-zinc-950 uppercase leading-none">
                  {tournamentName}
                </h1>
                <p className="font-header text-[11px] uppercase text-yellow-650 font-black tracking-widest mt-1.5 flex items-center gap-1.5">
                  {secondaryText} • {config.sport}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3.5 py-1.5 bg-zinc-950 text-white font-header font-black text-xs uppercase rounded-none tracking-wider">
                TEMPORADA 2026
              </span>
            </div>
          </div>

          {/* Sección 1: Datos del Equipo */}
          <div>
            <h2 className="flex items-center gap-2 font-header font-black text-sm text-zinc-950 uppercase border-b-2 border-zinc-300 pb-2 mb-4 tracking-wider">
              <Shield className="w-4 h-4 text-yellow-650" /> 1. Datos Generales del Club / Equipo
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-1 col-span-2">
                <span className="font-header font-black text-[10px] uppercase tracking-wider text-zinc-650">Nombre Oficial del Equipo</span>
                <input 
                  type="text" 
                  placeholder="Escribe el nombre del club..."
                  className="h-9 px-3 bg-zinc-100 border border-zinc-300 rounded-none text-zinc-900 text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none placeholder-zinc-450"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-header font-black text-[10px] uppercase tracking-wider text-zinc-650">Delegado Responsable</span>
                <input 
                  type="text" 
                  placeholder="Nombre y Apellidos..."
                  className="h-9 px-3 bg-zinc-100 border border-zinc-300 rounded-none text-zinc-900 text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none placeholder-zinc-450"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-header font-black text-[10px] uppercase tracking-wider text-zinc-650">Teléfono y Correo de Contacto</span>
                <input 
                  type="text" 
                  placeholder="Ej: delegado@club.com..."
                  className="h-9 px-3 bg-zinc-100 border border-zinc-300 rounded-none text-zinc-900 text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none placeholder-zinc-450"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Relación de Jugadores */}
          <div>
            <h2 className="flex items-center gap-2 font-header font-black text-sm text-zinc-950 uppercase border-b-2 border-zinc-300 pb-2 mb-4 tracking-wider">
              <Users className="w-4 h-4 text-yellow-650" /> 2. Relación de Jugadores Inscritos
            </h2>
            <table className="w-full text-xs text-left border-collapse border border-zinc-300 rounded-none overflow-hidden">
              <thead>
                <tr className="bg-zinc-950 text-white font-header font-black text-[10px] tracking-wider uppercase">
                  <th className="border border-zinc-300 p-2 text-center w-10">Nº</th>
                  <th className="border border-zinc-300 p-2 w-6/12">Nombre Completo y Apellidos</th>
                  <th className="border border-zinc-300 p-2 w-3/12">DNI / Pasaporte</th>
                  <th className="border border-zinc-300 p-2">Firma del Jugador</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row} className="h-8 hover:bg-zinc-50 transition-colors">
                    <td className="border border-zinc-300 text-center font-sans font-bold text-zinc-450 bg-zinc-100">{row}</td>
                    <td className="border border-zinc-300 p-0 bg-zinc-50/50">
                      <input 
                        type="text" 
                        className="w-full h-8 px-2 bg-transparent border-none text-zinc-900 text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                      />
                    </td>
                    <td className="border border-zinc-300 p-0 bg-zinc-50/50">
                      <input 
                        type="text" 
                        className="w-full h-8 px-2 bg-transparent border-none text-zinc-900 text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                      />
                    </td>
                    <td className="border border-zinc-300 p-0 bg-zinc-100/50"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección 3: Bloque de Firma Limpio y Minimalista (Borde Superior) */}
        <div className="border-t-2 border-zinc-350 pt-10 mt-10 relative z-10">
          <div className="grid grid-cols-3 gap-8 text-[10px] text-zinc-650 leading-relaxed font-sans">
            <div className="flex flex-col gap-1 text-center">
              <div className="h-12 border-b border-zinc-400"></div>
              <span className="font-header font-black uppercase text-[10px] tracking-wider text-zinc-500 mt-2">
                Firma del Representante del Equipo
              </span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <div className="h-12 border-b border-zinc-400"></div>
              <span className="font-header font-black uppercase text-[10px] tracking-wider text-zinc-500 mt-2">
                Aclaración / Nombre
              </span>
            </div>
            <div className="flex flex-col gap-1 text-center">
              <div className="h-12 border-b border-zinc-400"></div>
              <span className="font-header font-black uppercase text-[10px] tracking-wider text-zinc-500 mt-2">
                Fecha
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

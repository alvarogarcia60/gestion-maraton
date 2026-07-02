'use client';

import React, { useRef, useState } from 'react';
import { Match, Team } from '@/types';
import { Trophy, ShieldAlert, Check, Calendar, MapPin, GitMerge } from 'lucide-react';
import ExportButton from './ExportButton';

interface BracketTreeProps {
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  teams: Team[];
}

export default function BracketTree({ matches, setMatches, teams }: BracketTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const getTeamById = (id: string | null) => {
    if (!id) return { name: 'Por determinar', logoUrl: '❓', id: '' };
    if (id === 'BYE') return { name: 'EXENTO (BYE)', logoUrl: '💤', id: 'BYE' };
    return teams.find(t => t.id === id) || { name: 'Por determinar', logoUrl: '❓', id: '' };
  };

  const handleScoreChange = (matchId: string, side: 'home' | 'away', val: string) => {
    const score = val === '' ? undefined : parseInt(val, 10);
    if (score !== undefined && isNaN(score)) return;

    const updatedMatches = matches.map(m => {
      if (m.id !== matchId) return m;

      const updated = { ...m };
      if (side === 'home') updated.homeScore = score;
      else updated.awayScore = score;

      if (updated.homeScore !== undefined && updated.awayScore !== undefined) {
        updated.status = 'played';
      } else {
        updated.status = 'scheduled';
      }
      return updated;
    });

    const currentMatch = updatedMatches.find(m => m.id === matchId)!;
    if (currentMatch.status === 'played' && currentMatch.nextMatchId) {
      const winnerId = currentMatch.homeScore! > currentMatch.awayScore! 
        ? currentMatch.homeTeamId 
        : currentMatch.awayScore! > currentMatch.homeScore!
          ? currentMatch.awayTeamId
          : currentMatch.homeTeamId; // Desempate local por defecto

      const nextMatchIndex = updatedMatches.findIndex(m => m.id === currentMatch.nextMatchId);
      if (nextMatchIndex !== -1 && winnerId) {
        const nextMatch = { ...updatedMatches[nextMatchIndex] };
        if (currentMatch.nextMatchPosition === 'home') {
          nextMatch.homeTeamId = winnerId;
        } else {
          nextMatch.awayTeamId = winnerId;
        }
        updatedMatches[nextMatchIndex] = nextMatch;
      }
    }

    setMatches(updatedMatches);
  };

  const handleScheduleChange = (matchId: string, field: 'fechaHora' | 'pistaCampo', value: string) => {
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return { ...m, [field]: value };
      }
      return m;
    });
    setMatches(updatedMatches);
  };

  // Agrupar partidos por ronda dinámicamente preservando el orden cronológico
  const roundNames = Array.from(new Set(matches.map(m => m.roundName)));
  const roundsBeforeFinal = roundNames.filter(name => name !== 'Final').reverse(); // Reverso para ordenar de Cuartos a Semis
  const finalMatch = matches.find(m => m.roundName === 'Final');

  let champion: Team | null = null;
  if (finalMatch && finalMatch.status === 'played' && finalMatch.homeScore !== undefined && finalMatch.awayScore !== undefined) {
    const championId = finalMatch.homeScore > finalMatch.awayScore 
      ? finalMatch.homeTeamId 
      : finalMatch.awayScore > finalMatch.homeScore
        ? finalMatch.awayTeamId
        : finalMatch.homeTeamId;

    champion = teams.find(t => t.id === championId) || null;
  }

  // Componente de Tarjeta de Partido Reutilizable con Conectores
  const MatchCard = ({ match, side }: { match: Match; side: 'left' | 'right' | 'center' }) => {
    const home = getTeamById(match.homeTeamId);
    const away = getTeamById(match.awayTeamId);
    
    const isHomeBye = match.homeTeamId === 'BYE';
    const isAwayBye = match.awayTeamId === 'BYE';
    const hasBye = isHomeBye || isAwayBye;
    const isTbd = (!match.homeTeamId || !match.awayTeamId) && !hasBye;

    const homeWins = match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore > match.awayScore;
    const awayWins = match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined && match.awayScore > match.homeScore;

    const isEditing = editingMatchId === match.id;

    return (
      <div 
        className={`bg-zinc-900 border rounded-sm p-4 shadow-xl transition-all duration-300 relative group flex flex-col gap-2 ${
          side === 'center' ? 'border-yellow-400 border-2 w-full max-w-[320px] shadow-[0_0_25px_rgba(250,204,21,0.1)]' : 'w-full max-w-[260px]'
        } ${
          hasBye 
            ? 'border-yellow-400/20 bg-zinc-900/40 opacity-75' 
            : isTbd 
              ? 'border-zinc-850 opacity-70' 
              : 'border-zinc-800 hover:border-yellow-400/40'
        }`}
      >
        {/* Conectores Horizontales de Llave */}
        {side === 'left' && (
          <div className="absolute top-1/2 -right-8 w-8 h-[1.5px] bg-gradient-to-r from-zinc-800 to-zinc-950 no-print pointer-events-none"></div>
        )}
        {side === 'right' && (
          <div className="absolute top-1/2 -left-8 w-8 h-[1.5px] bg-gradient-to-l from-zinc-800 to-zinc-950 no-print pointer-events-none"></div>
        )}
        {side === 'center' && (
          <>
            <div className="absolute top-1/2 -left-8 w-8 h-[1.5px] bg-zinc-800 no-print pointer-events-none"></div>
            <div className="absolute top-1/2 -right-8 w-8 h-[1.5px] bg-zinc-800 no-print pointer-events-none"></div>
          </>
        )}

        {/* Programador de Fecha/Pista */}
        {!isEditing && (
          <div className="flex justify-between items-center text-[9px] text-zinc-500 border-b border-zinc-850/50 pb-1.5 mb-1">
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-2.5 h-2.5 text-zinc-650" />
              {match.fechaHora 
                ? new Date(match.fechaHora).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : 'Sin programar'}
            </span>
            <span className="flex items-center gap-1 font-bold text-yellow-400/70">
              <MapPin className="w-2.5 h-2.5 text-zinc-650" />
              {match.pistaCampo || 'TBD'}
            </span>
            
            <button
              onClick={() => setEditingMatchId(match.id)}
              className="text-[8px] text-zinc-600 hover:text-yellow-400 font-header font-black tracking-wider uppercase transition-colors ml-2 no-print cursor-pointer"
            >
              Editar
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-2 p-2 bg-zinc-950 border border-zinc-850">
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] uppercase text-zinc-500 font-header font-bold tracking-wider">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={match.fechaHora || ''}
                onChange={(e) => handleScheduleChange(match.id, 'fechaHora', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-white p-1 focus:ring-1 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] uppercase text-zinc-500 font-header font-bold tracking-wider">Pista / Campo</label>
              <input
                type="text"
                placeholder="Ej. Campo A"
                value={match.pistaCampo || ''}
                onChange={(e) => handleScheduleChange(match.id, 'pistaCampo', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-[10px] text-white p-1 focus:ring-1 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setEditingMatchId(null)}
              className="w-full py-1 bg-yellow-400 hover:bg-yellow-350 text-black font-header font-black text-[9px] uppercase tracking-wider transition-colors mt-1 cursor-pointer"
            >
              Confirmar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Local */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate w-9/12">
                <div className="w-6 h-6 bg-zinc-950 rounded-none flex items-center justify-center text-xs border border-zinc-800">
                  {home.logoUrl}
                </div>
                <span className={`font-header font-black uppercase text-[11px] truncate ${
                  !match.homeTeamId ? 'text-zinc-650 italic' : 'text-zinc-200'
                } ${homeWins ? 'text-yellow-400 font-black' : ''}`}>
                  {home.name}
                </span>
              </div>
              {isHomeBye ? (
                <span className="text-[9px] font-header font-bold text-yellow-400/85 bg-yellow-400/5 border border-yellow-400/10 px-1 py-0.5 rounded-none">[EXENTO]</span>
              ) : (
                <input
                  type="text"
                  pattern="[0-9]*"
                  placeholder="-"
                  disabled={isTbd || hasBye}
                  value={match.homeScore ?? ''}
                  onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                  className="w-6 h-6 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white disabled:opacity-30"
                />
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-zinc-850/60 my-0.5"></div>

            {/* Visitante */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate w-9/12">
                <div className="w-6 h-6 bg-zinc-950 rounded-none flex items-center justify-center text-xs border border-zinc-800">
                  {away.logoUrl}
                </div>
                <span className={`font-header font-black uppercase text-[11px] truncate ${
                  !match.awayTeamId ? 'text-zinc-650 italic' : 'text-zinc-200'
                } ${awayWins ? 'text-yellow-400 font-black' : ''}`}>
                  {away.name}
                </span>
              </div>
              {isAwayBye ? (
                <span className="text-[9px] font-header font-bold text-yellow-400/85 bg-yellow-400/5 border border-yellow-400/10 px-1 py-0.5 rounded-none">[EXENTO]</span>
              ) : (
                <input
                  type="text"
                  pattern="[0-9]*"
                  placeholder="-"
                  disabled={isTbd || hasBye}
                  value={match.awayScore ?? ''}
                  onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                  className="w-6 h-6 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white disabled:opacity-30"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const hasTeamsAssigned = matches.some(m => m.homeTeamId !== null && m.homeTeamId !== 'BYE');

  if (!hasTeamsAssigned) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mt-4">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-none text-center flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 mb-2">
            <GitMerge className="w-8 h-8" />
          </div>
          <h3 className="font-header font-black text-lg text-white uppercase tracking-wider">El Árbol de Cruces se generará automáticamente</h3>
          <p className="text-zinc-400 text-xs leading-relaxed max-w-lg font-sans">
            Para poder visualizar y jugar las eliminatorias de la Fase Final, primero debes completar todos los partidos de la <strong>Fase de Grupos</strong>.
          </p>
          <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-none w-full text-left flex flex-col gap-2 mt-2">
            <span className="font-header font-bold text-[10px] uppercase text-yellow-400">💡 Instrucciones para la Organización:</span>
            <ul className="text-zinc-500 text-[11px] list-disc list-inside flex flex-col gap-1.5 leading-relaxed font-sans">
              <li>Registra todos los marcadores en la pestaña <strong>Fase de Grupos (Sorteo)</strong>.</li>
              <li>Al completarse el último partido, se desbloqueará el botón amarillo <strong>"Consolidar Cruces y Generar Cuadro"</strong> al final de esa página.</li>
              <li>Haz clic en él para calcular las clasificaciones y sembrar automáticamente los cruces en este árbol.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      
      {/* Barra superior de control */}
      <div className="flex justify-between items-center w-full max-w-7xl no-print">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="font-header font-black text-sm uppercase tracking-wider text-zinc-300">Fase Final de Eliminatorias</h2>
        </div>
        <ExportButton 
          elementRef={containerRef} 
          fileName="Cuadro_Cruces_Finales" 
        />
      </div>

      {/* Cartel de Cruces Simétrico */}
      <div 
        ref={containerRef}
        className="w-full max-w-7xl bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-none p-8 flex flex-col gap-10 transition-all duration-300 relative overflow-hidden"
      >
        {/* Línea decorativa superior */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60"></div>
        
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-[0.01] pointer-events-none flex items-center justify-center">
          <Trophy className="w-96 h-96 text-yellow-400" />
        </div>

        {/* Encabezado */}
        <div className="text-center border-b border-zinc-850 pb-5 relative z-10">
          <span className="font-header font-black text-[10px] tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-4 py-1 rounded-none">
            BRACKET OFICIAL FINAL FOUR CONVERGENTE
          </span>
          <h1 className="font-header font-black text-3xl text-white uppercase tracking-tight mt-2.5">
            Árbol de Cruces y Eliminatorias
          </h1>
          <p className="font-header text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1">
            Doble llave lateral simétrica • Gran Final Central
          </p>
        </div>

        {/* Estructura del Árbol Simétrico Responsivo */}
        <div className="w-full overflow-x-auto min-h-[600px] flex justify-between items-stretch bg-zinc-950 py-4 relative z-10 gap-4">
          
          {/* BLOQUE IZQUIERDO: Rondas previas de la Llave A */}
          <div className="flex flex-row items-stretch gap-12 flex-1 justify-end">
            {roundsBeforeFinal.map((roundName) => {
              const roundMatches = matches.filter(m => m.roundName === roundName);
              // Mitad izquierda
              const leftMatches = roundMatches.slice(0, roundMatches.length / 2);
              
              return (
                <div key={`left-${roundName}`} className="flex flex-col gap-6 justify-around min-w-[240px]">
                  <h3 className="font-header font-black text-[11px] tracking-widest text-zinc-500 text-center uppercase border-b border-zinc-900 pb-2">
                    {roundName} (Llave A)
                  </h3>
                  <div className="flex flex-col gap-8 justify-around h-full py-2 items-center">
                    {leftMatches.map((match) => (
                      <MatchCard key={match.id} match={match} side="left" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BLOQUE CENTRAL: Gran Final y Campeón */}
          <div className="flex flex-col items-center justify-center gap-8 mx-6 min-w-[280px]">
            {finalMatch && (
              <div className="flex flex-col items-center gap-4 w-full">
                <h3 className="font-header font-black text-[11px] tracking-widest text-yellow-400 text-center uppercase border-b border-zinc-900 pb-2 w-full">
                  GRAN FINAL
                </h3>
                <MatchCard match={finalMatch} side="center" />
              </div>
            )}
            
            {/* Campeón Final */}
            <div className="flex flex-col items-center justify-center w-full">
              {champion ? (
                <div className="flex flex-col items-center gap-5 bg-gradient-to-br from-yellow-400/10 via-amber-400/20 to-yellow-600/10 border-2 border-yellow-400 rounded-none p-6 shadow-[0_0_30px_rgba(250,204,21,0.15)] text-center w-full max-w-[200px] animate-pulse">
                  <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-none flex items-center justify-center text-3xl shadow-lg border border-white/10 relative">
                    🏆
                    <span className="absolute -top-1.5 -right-1 bg-yellow-400 text-black text-[8px] font-data font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider">
                      NO.1
                    </span>
                  </div>
                  <div>
                    <h4 className="font-header font-black text-yellow-400 text-sm truncate uppercase tracking-wider">
                      {champion.name}
                    </h4>
                    <p className="font-header text-[9px] text-yellow-400 font-extrabold uppercase mt-1.5 tracking-widest flex items-center justify-center gap-1 bg-yellow-400/10 px-2 py-1 rounded-none border border-yellow-400/20">
                      <Check className="w-2.5 h-2.5" /> CAMPEÓN OFICIAL
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 bg-zinc-900 border border-dashed border-zinc-800 rounded-none p-6 text-center w-full max-w-[200px] opacity-60">
                  <div className="w-14 h-14 bg-zinc-950 rounded-none flex items-center justify-center text-2xl text-zinc-700 border border-zinc-800">
                    🏆
                  </div>
                  <span className="font-header text-[9px] uppercase tracking-widest font-black text-zinc-650 italic">
                    ESPERANDO CAMPEÓN
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BLOQUE DERECHO: Rondas previas de la Llave B */}
          <div className="flex flex-row-reverse items-stretch gap-12 flex-1 justify-end">
            {roundsBeforeFinal.map((roundName) => {
              const roundMatches = matches.filter(m => m.roundName === roundName);
              // Mitad derecha
              const rightMatches = roundMatches.slice(roundMatches.length / 2);
              
              return (
                <div key={`right-${roundName}`} className="flex flex-col gap-6 justify-around min-w-[240px]">
                  <h3 className="font-header font-black text-[11px] tracking-widest text-zinc-550 text-center uppercase border-b border-zinc-900 pb-2">
                    {roundName} (Llave B)
                  </h3>
                  <div className="flex flex-col gap-8 justify-around h-full py-2 items-center">
                    {rightMatches.map((match) => (
                      <MatchCard key={match.id} match={match} side="right" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

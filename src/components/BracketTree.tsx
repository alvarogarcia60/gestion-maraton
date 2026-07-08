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
  const [isExporting, setIsExporting] = useState(false);

  const getTeamById = (id: string | null) => {
    if (!id) return { name: 'Por determinar', logoUrl: '❓', id: '' };
    if (id === 'BYE') return { name: 'EXENTO (BYE)', logoUrl: '💤', id: 'BYE' };
    return teams.find(t => t.id === id) || { name: 'Por determinar', logoUrl: '❓', id: '' };
  };

  const formatMatchDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  // Propagación recursiva de ganadores y limpieza en cascada
  const propagateWinnerCascade = (matchesList: Match[], matchId: string, winnerId: string | null) => {
    const currentMatch = matchesList.find(m => m.id === matchId);
    if (!currentMatch || !currentMatch.nextMatchId) return;

    const nextMatchIndex = matchesList.findIndex(m => m.id === currentMatch.nextMatchId);
    if (nextMatchIndex === -1) return;

    const nextMatch = { ...matchesList[nextMatchIndex] };
    const oldTeamId = currentMatch.nextMatchPosition === 'home' ? nextMatch.homeTeamId : nextMatch.awayTeamId;

    // Actualizar el equipo en el siguiente partido
    if (currentMatch.nextMatchPosition === 'home') {
      nextMatch.homeTeamId = winnerId;
    } else {
      nextMatch.awayTeamId = winnerId;
    }

    // Si el equipo asignado cambió, reseteamos el marcador del partido destino
    // y propagamos en cascada un null
    if (oldTeamId !== winnerId) {
      nextMatch.homeScore = undefined;
      nextMatch.awayScore = undefined;
      nextMatch.homePenalties = undefined;
      nextMatch.awayPenalties = undefined;
      nextMatch.status = 'scheduled';
      matchesList[nextMatchIndex] = nextMatch;

      propagateWinnerCascade(matchesList, nextMatch.id, null);
    } else {
      matchesList[nextMatchIndex] = nextMatch;
    }
  };

  const handleScoreChange = (matchId: string, side: 'home' | 'away', val: string) => {
    const score = val === '' ? undefined : parseInt(val, 10);
    if (score !== undefined && isNaN(score)) return;

    const updatedMatches = matches.map(m => {
      if (m.id !== matchId) return m;

      const updated = { ...m };
      if (side === 'home') updated.homeScore = score;
      else updated.awayScore = score;

      // Si cambian los goles principales, limpiamos penaltis si ya no hay empate
      if (updated.homeScore !== updated.awayScore) {
        updated.homePenalties = undefined;
        updated.awayPenalties = undefined;
      }

      return updated;
    });

    const currentMatchIndex = updatedMatches.findIndex(m => m.id === matchId);
    const currentMatch = { ...updatedMatches[currentMatchIndex] };
    
    let winnerId: string | null = null;
    if (currentMatch.homeScore !== undefined && currentMatch.awayScore !== undefined) {
      if (currentMatch.homeScore > currentMatch.awayScore) {
        winnerId = currentMatch.homeTeamId;
        currentMatch.status = 'played';
      } else if (currentMatch.awayScore > currentMatch.homeScore) {
        winnerId = currentMatch.awayTeamId;
        currentMatch.status = 'played';
      } else {
        // Empate: requiere penaltis
        if (currentMatch.homePenalties !== undefined && currentMatch.awayPenalties !== undefined && currentMatch.homePenalties !== currentMatch.awayPenalties) {
          winnerId = currentMatch.homePenalties > currentMatch.awayPenalties ? currentMatch.homeTeamId : currentMatch.awayTeamId;
          currentMatch.status = 'played';
        } else {
          currentMatch.status = 'scheduled'; // Pendiente de penaltis
        }
      }
    } else {
      currentMatch.status = 'scheduled';
    }

    updatedMatches[currentMatchIndex] = currentMatch;
    propagateWinnerCascade(updatedMatches, matchId, winnerId);
    setMatches(updatedMatches);
  };

  const handlePenaltiesChange = (matchId: string, side: 'home' | 'away', val: string) => {
    const score = val === '' ? undefined : parseInt(val, 10);
    if (score !== undefined && isNaN(score)) return;

    const updatedMatches = matches.map(m => {
      if (m.id !== matchId) return m;
      const updated = { ...m };
      if (side === 'home') updated.homePenalties = score;
      else updated.awayPenalties = score;
      return updated;
    });

    const currentMatchIndex = updatedMatches.findIndex(m => m.id === matchId);
    const currentMatch = { ...updatedMatches[currentMatchIndex] };

    let winnerId: string | null = null;
    if (currentMatch.homeScore !== undefined && currentMatch.awayScore !== undefined && currentMatch.homeScore === currentMatch.awayScore) {
      if (currentMatch.homePenalties !== undefined && currentMatch.awayPenalties !== undefined && currentMatch.homePenalties !== currentMatch.awayPenalties) {
        winnerId = currentMatch.homePenalties > currentMatch.awayPenalties ? currentMatch.homeTeamId : currentMatch.awayTeamId;
        currentMatch.status = 'played';
      } else {
        currentMatch.status = 'scheduled';
      }
    }

    updatedMatches[currentMatchIndex] = currentMatch;
    propagateWinnerCascade(updatedMatches, matchId, winnerId);
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

  // Helper to extract the round level (L) from a match ID (higher L means earlier round)
  const getRoundLevel = (roundName: string) => {
    const nameLower = roundName.toLowerCase();
    if (nameLower.includes('dieciseis')) return 4;
    if (nameLower.includes('octavos')) return 3;
    if (nameLower.includes('cuartos')) return 2;
    if (nameLower.includes('semi')) return 1;
    if (nameLower.includes('final')) return 0;

    const roundMatch = matches.find(m => m.roundName === roundName);
    if (!roundMatch) return 0;
    const match = roundMatch.id.match(/-L(\d+)-/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const roundNames = Array.from(new Set(matches.map(m => m.roundName)));
  const roundsBeforeFinal = roundNames
    .filter(name => name !== 'Final')
    .sort((a, b) => getRoundLevel(b) - getRoundLevel(a)); // Descendente: L más alto primero (ej. Cuartos antes de Semis)
  const finalMatch = matches.find(m => m.roundName === 'Final');

  let champion: Team | null = null;
  if (finalMatch && finalMatch.status === 'played' && finalMatch.homeScore !== undefined && finalMatch.awayScore !== undefined) {
    let championId: string | null = null;
    if (finalMatch.homeScore > finalMatch.awayScore) {
      championId = finalMatch.homeTeamId;
    } else if (finalMatch.awayScore > finalMatch.homeScore) {
      championId = finalMatch.awayTeamId;
    } else if (finalMatch.homePenalties !== undefined && finalMatch.awayPenalties !== undefined) {
      championId = finalMatch.homePenalties > finalMatch.awayPenalties ? finalMatch.homeTeamId : finalMatch.awayTeamId;
    }

    champion = teams.find(t => t.id === championId) || null;
  }
  const renderMatchCard = (match: Match, side: 'left' | 'right' | 'center') => {
    const home = getTeamById(match.homeTeamId);
    const away = getTeamById(match.awayTeamId);
    
    const isHomeBye = match.homeTeamId === 'BYE';
    const isAwayBye = match.awayTeamId === 'BYE';
    const hasBye = isHomeBye || isAwayBye;
    const isTbd = (!match.homeTeamId || !match.awayTeamId) && !hasBye;

    const homeWins = match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined && 
      (match.homeScore > match.awayScore || (match.homeScore === match.awayScore && match.homePenalties !== undefined && match.awayPenalties !== undefined && match.homePenalties > match.awayPenalties));
    const awayWins = match.status === 'played' && match.homeScore !== undefined && match.awayScore !== undefined && 
      (match.awayScore > match.homeScore || (match.homeScore === match.awayScore && match.homePenalties !== undefined && match.awayPenalties !== undefined && match.awayPenalties > match.homePenalties));

    const isEditing = editingMatchId === match.id;

    return (
      <div 
        className={`bg-zinc-900 border rounded-sm p-3 shadow-xl transition-all duration-300 relative group flex flex-col gap-1.5 ${
          side === 'center' ? 'border-yellow-400 border-2 w-full max-w-[230px] shadow-[0_0_25px_rgba(250,204,21,0.1)]' : 'w-full max-w-[190px]'
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

        {/* Cabecera de Horario y Campo Editable en Cuadro */}
        <div className="flex justify-between items-center text-[9px] border-b border-zinc-850/50 pb-1.5 mb-1 gap-1.5">
          <div className="flex items-center gap-1 w-7/12">
            <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            {isExporting ? (
              <span className="text-[9.5px] text-yellow-450 font-mono font-black px-1 py-0.5 leading-none select-none">
                {match.fechaHora ? formatMatchDate(match.fechaHora) : '—'}
              </span>
            ) : (
              <input
                type="datetime-local"
                value={match.fechaHora || ''}
                onChange={(e) => handleScheduleChange(match.id, 'fechaHora', e.target.value)}
                className="bg-transparent hover:bg-zinc-950 focus:bg-zinc-950 border border-transparent hover:border-zinc-850 focus:border-yellow-400/40 text-[9px] text-yellow-450 font-mono font-black px-1 py-0.5 rounded-none w-full focus:outline-none transition-all cursor-pointer"
              />
            )}
          </div>
          <div className="flex items-center gap-1 w-5/12 justify-end">
            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            {isExporting ? (
              <span className="text-[8.5px] text-zinc-400 font-header font-black uppercase text-right leading-none select-none">
                {match.pistaCampo || '—'}
              </span>
            ) : (
              <input
                type="text"
                value={match.pistaCampo || ''}
                placeholder="CAMPO/PISTA"
                onChange={(e) => handleScheduleChange(match.id, 'pistaCampo', e.target.value)}
                className="bg-transparent hover:bg-zinc-950 focus:bg-zinc-950 border border-transparent hover:border-zinc-850 focus:border-yellow-400/40 text-[8.5px] text-zinc-200 font-header font-black uppercase text-right px-1 py-0.5 rounded-none w-full focus:outline-none transition-all cursor-text"
              />
            )}
          </div>
        </div>
          <div className="flex flex-col gap-2">
            {/* Local */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 truncate flex-1">
                <div className="w-5 h-5 bg-zinc-950 rounded-none flex items-center justify-center text-xs border border-zinc-800 shrink-0">
                  {home.logoUrl}
                </div>
                <span className={`font-header font-black uppercase text-[10px] truncate ${
                  !match.homeTeamId ? 'text-zinc-650 italic' : 'text-zinc-200'
                } ${homeWins ? 'text-yellow-400 font-black' : ''}`}>
                  {home.name}
                </span>
              </div>
              {isHomeBye ? (
                <span className="text-[8px] font-header font-bold text-yellow-400/85 bg-yellow-400/5 border border-yellow-400/10 px-1 py-0.5 rounded-none shrink-0">[EXENTO]</span>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  {match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore === match.awayScore && match.homePenalties !== undefined && (
                    <span className="text-[9px] font-mono font-bold text-yellow-400">({match.homePenalties})</span>
                  )}
                  {isExporting ? (
                    <span className="w-5.5 h-5.5 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white select-none">
                      {match.homeScore !== undefined ? match.homeScore : '-'}
                    </span>
                  ) : (
                    <input
                      type="text"
                      pattern="[0-9]*"
                      placeholder="-"
                      disabled={isTbd || hasBye}
                      value={match.homeScore ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                      className="w-5.5 h-5.5 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white disabled:opacity-30"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-zinc-850/60 my-0.5"></div>

            {/* Visitante */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 truncate flex-1">
                <div className="w-5 h-5 bg-zinc-950 rounded-none flex items-center justify-center text-xs border border-zinc-800 shrink-0">
                  {away.logoUrl}
                </div>
                <span className={`font-header font-black uppercase text-[10px] truncate ${
                  !match.awayTeamId ? 'text-zinc-650 italic' : 'text-zinc-200'
                } ${awayWins ? 'text-yellow-400 font-black' : ''}`}>
                  {away.name}
                </span>
              </div>
              {isAwayBye ? (
                <span className="text-[8px] font-header font-bold text-yellow-400/85 bg-yellow-400/5 border border-yellow-400/10 px-1 py-0.5 rounded-none shrink-0">[EXENTO]</span>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  {isExporting ? (
                    <span className="w-5.5 h-5.5 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white select-none">
                      {match.awayScore !== undefined ? match.awayScore : '-'}
                    </span>
                  ) : (
                    <input
                      type="text"
                      pattern="[0-9]*"
                      placeholder="-"
                      disabled={isTbd || hasBye}
                      value={match.awayScore ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                      className="w-5.5 h-5.5 text-center font-data font-black text-xs bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white disabled:opacity-30"
                    />
                  )}
                  {match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore === match.awayScore && match.awayPenalties !== undefined && (
                    <span className="text-[9px] font-mono font-bold text-yellow-400">({match.awayPenalties})</span>
                  )}
                </div>
              )}
            </div>

            {/* Tanda de penaltis en caso de empate */}
            {match.homeScore !== undefined && match.awayScore !== undefined && match.homeScore === match.awayScore && !hasBye && !isExporting && (
              <div className="flex flex-col gap-1 mt-1 bg-yellow-400/5 border border-yellow-400/10 p-1.5 rounded-sm no-print">
                <div className="flex justify-between items-center text-[8px] font-header font-black tracking-wider text-yellow-400 uppercase">
                  <span>Tanda de Penaltis</span>
                  {match.homePenalties !== undefined && match.awayPenalties !== undefined && match.homePenalties === match.awayPenalties && (
                    <span className="text-rose-450 font-bold">Sin empate</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[9px] text-zinc-400 font-header uppercase font-bold truncate max-w-[60px]">{home.name}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      pattern="[0-9]*"
                      placeholder="Pen"
                      value={match.homePenalties ?? ''}
                      onChange={(e) => handlePenaltiesChange(match.id, 'home', e.target.value)}
                      className="w-7 h-5 text-center font-data font-black text-[9px] bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:outline-none text-white shadow-inner"
                    />
                    <span className="text-zinc-600 font-bold text-[9px]">:</span>
                    <input
                      type="text"
                      pattern="[0-9]*"
                      placeholder="Pen"
                      value={match.awayPenalties ?? ''}
                      onChange={(e) => handlePenaltiesChange(match.id, 'away', e.target.value)}
                      className="w-7 h-5 text-center font-data font-black text-[9px] bg-zinc-950 border border-zinc-800 rounded-none focus:border-yellow-400 focus:outline-none text-white shadow-inner"
                    />
                  </div>
                  <span className="text-[9px] text-zinc-400 font-header uppercase font-bold text-right truncate max-w-[60px]">{away.name}</span>
                </div>
              </div>
            )}
          </div>
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
          onBeforeExport={() => setIsExporting(true)}
          onAfterExport={() => setIsExporting(false)}
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

        <style>{`
          .export-mode {
            width: 1280px !important;
            max-width: 1280px !important;
            min-width: 1280px !important;
            padding: 24px !important;
          }
          .export-mode .overflow-x-auto {
            overflow-x: visible !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
          }
          .export-mode .no-print {
            display: none !important;
          }
          .export-mode .export-hidden {
            display: none !important;
          }
          .export-mode .export-visible {
            display: inline-block !important;
          }
          .export-mode div.export-visible {
            display: flex !important;
          }
        `}</style>

        {/* Estructura del Árbol Simétrico Responsivo */}
        <div className="w-full overflow-x-auto min-h-[600px] flex justify-between items-stretch bg-zinc-950 py-4 relative z-10 gap-3 md:gap-4">
          
          {/* BLOQUE IZQUIERDO: Rondas previas de la Llave A */}
          <div className="flex flex-row items-stretch gap-3 md:gap-4 flex-1 justify-end">
            {roundsBeforeFinal.map((roundName) => {
              const roundMatches = matches.filter(m => m.roundName === roundName);
              // Mitad izquierda
              const leftMatches = roundMatches.slice(0, roundMatches.length / 2);
              
              return (
                <div key={`left-${roundName}`} className="flex flex-col gap-4 justify-around min-w-[190px] w-[190px] max-w-[190px]">
                  <h3 className="font-header font-black text-[10px] tracking-widest text-zinc-500 text-center uppercase border-b border-zinc-900 pb-2">
                    {roundName} (Llave A)
                  </h3>
                  <div className="flex flex-col gap-6 justify-around h-full py-2 items-center">
                    {leftMatches.map((match) => (
                      <React.Fragment key={match.id}>
                        {renderMatchCard(match, 'left')}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* BLOQUE CENTRAL: Gran Final y Campeón */}
          <div className="flex flex-col items-center justify-center gap-6 mx-2 min-w-[230px] w-[230px] max-w-[230px]">
            {finalMatch && (
              <div className="flex flex-col items-center gap-3 w-full">
                <h3 className="font-header font-black text-[10px] tracking-widest text-yellow-400 text-center uppercase border-b border-zinc-900 pb-2 w-full">
                  GRAN FINAL
                </h3>
                {renderMatchCard(finalMatch, 'center')}
              </div>
            )}
            
            {/* Campeón Final */}
            <div className="flex flex-col items-center justify-center w-full">
              {champion ? (
                <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-yellow-400/10 via-amber-400/20 to-yellow-600/10 border-2 border-yellow-400 rounded-none p-5 shadow-[0_0_30px_rgba(250,204,21,0.15)] text-center w-full max-w-[180px] animate-pulse">
                  <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-none flex items-center justify-center text-2xl shadow-lg border border-white/10 relative">
                    🏆
                    <span className="absolute -top-1.5 -right-1 bg-yellow-400 text-black text-[8px] font-data font-black px-1.5 py-0.5 rounded-none uppercase tracking-wider">
                      NO.1
                    </span>
                  </div>
                  <div>
                    <h4 className="font-header font-black text-yellow-400 text-xs truncate uppercase tracking-wider">
                      {champion.name}
                    </h4>
                    <p className="font-header text-[8px] text-yellow-400 font-extrabold uppercase mt-1.5 tracking-widest flex items-center justify-center gap-1 bg-yellow-400/10 px-2 py-1 rounded-none border border-yellow-400/20">
                      <Check className="w-2 h-2" /> CAMPEÓN OFICIAL
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 bg-zinc-900 border border-dashed border-zinc-800 rounded-none p-5 text-center w-full max-w-[180px] opacity-60">
                  <div className="w-12 h-12 bg-zinc-950 rounded-none flex items-center justify-center text-xl text-zinc-700 border border-zinc-800">
                    🏆
                  </div>
                  <span className="font-header text-[8px] uppercase tracking-widest font-black text-zinc-650 italic">
                    ESPERANDO CAMPEÓN
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BLOQUE DERECHO: Rondas previas de la Llave B */}
          <div className="flex flex-row-reverse items-stretch gap-3 md:gap-4 flex-1 justify-end">
            {roundsBeforeFinal.map((roundName) => {
              const roundMatches = matches.filter(m => m.roundName === roundName);
              // Mitad derecha
              const rightMatches = roundMatches.slice(roundMatches.length / 2);
              
              return (
                <div key={`right-${roundName}`} className="flex flex-col gap-4 justify-around min-w-[190px] w-[190px] max-w-[190px]">
                  <h3 className="font-header font-black text-[10px] tracking-widest text-zinc-550 text-center uppercase border-b border-zinc-900 pb-2">
                    {roundName} (Llave B)
                  </h3>
                  <div className="flex flex-col gap-6 justify-around h-full py-2 items-center">
                    {rightMatches.map((match) => (
                      <React.Fragment key={match.id}>
                        {renderMatchCard(match, 'right')}
                      </React.Fragment>
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

'use client';

import React, { useState } from 'react';
import { Team, Group, Match, MatchStats, PlayerStats, GoalkeeperStats } from '@/types';
import { Trophy, Calendar, Shield, Users, Plus, Trash2, Award, Zap, Heart } from 'lucide-react';

interface StatsPanelProps {
  registeredTeams: Team[];
  groups: Group[];
  knockoutMatches: Match[];
  matchStats: Record<string, MatchStats>;
  setMatchStats: React.Dispatch<React.SetStateAction<Record<string, MatchStats>>>;
  onSaveTournament?: (updatedStats?: Record<string, MatchStats>) => Promise<void>;
}

export default function StatsPanel({
  registeredTeams,
  groups,
  knockoutMatches,
  matchStats,
  setMatchStats,
  onSaveTournament
}: StatsPanelProps) {
  // Pestaña interna de las tablas de estadísticas: 'scorers' | 'goalkeepers' | 'matches'
  const [innerTab, setInnerTab] = useState<'scorers' | 'goalkeepers' | 'matches'>('scorers');
  
  // Estado para el partido seleccionado para editar estadísticas
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Estado temporal local para los goleadores del modal
  const [modalScorers, setModalScorers] = useState<PlayerStats[]>([]);

  // Estados del editor de estadísticas de partido
  const [homeScorerId, setHomeScorerId] = useState<string>("");
  const [customHomeScorer, setCustomHomeScorer] = useState<string>("");
  const [homeScorerGoals, setHomeScorerGoals] = useState<number>(1);

  const [awayScorerId, setAwayScorerId] = useState<string>("");
  const [customAwayScorer, setCustomAwayScorer] = useState<string>("");
  const [awayScorerGoals, setAwayScorerGoals] = useState<number>(1);

  // Estados de porteros del partido
  const [homeGkId, setHomeGkId] = useState<string>("");
  const [customHomeGoalkeeper, setCustomHomeGoalkeeper] = useState<string>("");
  const [homeGkConceded, setHomeGkConceded] = useState<number>(0);
  const [homeGkMatches, setHomeGkMatches] = useState<number>(1);

  const [awayGkId, setAwayGkId] = useState<string>("");
  const [customAwayGoalkeeper, setCustomAwayGoalkeeper] = useState<string>("");
  const [awayGkConceded, setAwayGkConceded] = useState<number>(0);
  const [awayGkMatches, setAwayGkMatches] = useState<number>(1);

  // 1. Obtener todos los partidos del torneo (grupos + eliminatorias)
  const allMatches: Match[] = [];
  groups.forEach(g => {
    allMatches.push(...g.matches);
  });
  allMatches.push(...knockoutMatches);

  // Helper para buscar un equipo
  const findTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return registeredTeams.find(t => t.id === teamId) || null;
  };

  const groupMatchesWithTeams = groups.flatMap(g => g.matches).filter(match => {
    const home = findTeam(match.homeTeamId);
    const away = findTeam(match.awayTeamId);
    return home !== null && away !== null;
  });

  const knockoutMatchesWithTeams = knockoutMatches.filter(match => {
    const home = findTeam(match.homeTeamId);
    const away = findTeam(match.awayTeamId);
    return home !== null && away !== null;
  });

  const renderMatchCard = (match: Match) => {
    const homeTeam = findTeam(match.homeTeamId);
    const awayTeam = findTeam(match.awayTeamId);
    if (!homeTeam || !awayTeam) return null;
    
    const stats = matchStats[match.id];
    const hasStats = stats && (stats.scorers.length > 0 || stats.goalkeepers.length > 0);

    return (
      <div 
        key={match.id}
        className="bg-zinc-950 border border-zinc-850 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-all justify-between"
      >
        <div className="flex justify-between items-center text-[10px] text-zinc-550 border-b border-zinc-900 pb-2">
          <span className="font-header font-black uppercase text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/10 px-1.5 py-0.5">
            {match.roundName}
          </span>
          <span className="font-mono text-zinc-500">
            {match.fechaHora 
              ? new Date(match.fechaHora).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'TBD'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="font-header font-black text-xs uppercase text-zinc-300 w-5/12 truncate flex items-center gap-1.5">
            <span>{homeTeam.logoUrl}</span>
            <span className="truncate">{homeTeam.name}</span>
          </span>
          <span className="w-2/12 text-center font-data font-black text-sm text-yellow-400 bg-yellow-400/10 px-2 py-0.5 border border-yellow-400/20">
            {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
          </span>
          <span className="font-header font-black text-xs uppercase text-zinc-300 w-5/12 truncate flex items-center gap-1.5 justify-end text-right">
            <span className="truncate">{awayTeam.name}</span>
            <span>{awayTeam.logoUrl}</span>
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
          <span className="text-[10px] text-zinc-500 font-sans">
            {hasStats ? (
              <span className="text-emerald-400 font-bold">✓ Datos cargados</span>
            ) : (
              <span className="text-zinc-650 italic">Sin datos de jugadores</span>
            )}
          </span>
          <button
            onClick={() => handleOpenEditor(match)}
            className={`text-[10px] font-header font-black uppercase tracking-wider px-3 py-1.5 rounded-none cursor-pointer transition-colors ${
              hasStats ? 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700' : 'bg-yellow-400 text-black hover:bg-yellow-500'
            }`}
          >
            {hasStats ? 'Editar Estadísticas' : 'Cargar Goles/Porteros'}
          </button>
        </div>
      </div>
    );
  };

  // 2. Calcular estadísticas acumuladas
  const scorerTotals: Record<string, { name: string; teamName: string; logoUrl: string; goals: number }> = {};
  const gkTotals: Record<string, { name: string; teamName: string; logoUrl: string; conceded: number; matchesPlayed: number }> = {};

  Object.entries(matchStats).forEach(([matchId, stats]) => {
    const match = allMatches.find(m => m.id === matchId);

    // Sumar goleadores
    stats.scorers.forEach(s => {
      let teamName = "Desconocido";
      let logoUrl = "⚽";
      
      const team = registeredTeams.find(t => t.players?.some(p => p.id === s.playerId));
      if (team) {
        teamName = team.name;
        logoUrl = team.logoUrl || "⚽";
      } else if (match) {
        if (s.playerId.startsWith('custom_h_') && match.homeTeamId) {
          const t = findTeam(match.homeTeamId);
          if (t) {
            teamName = t.name;
            logoUrl = t.logoUrl || "⚽";
          }
        } else if (s.playerId.startsWith('custom_a_') && match.awayTeamId) {
          const t = findTeam(match.awayTeamId);
          if (t) {
            teamName = t.name;
            logoUrl = t.logoUrl || "⚽";
          }
        }
      }

      // Si es un jugador custom, usamos el nombre y el equipo como clave única
      // para poder acumular los goles del mismo jugador en diferentes partidos.
      const key = s.playerId.startsWith('custom_')
        ? `custom_${s.playerName.trim().toLowerCase()}_${teamName}`
        : s.playerId;

      if (!scorerTotals[key]) {
        scorerTotals[key] = { name: s.playerName, teamName, logoUrl, goals: 0 };
      }
      scorerTotals[key].goals += s.goals;
    });

    // Sumar porteros
    stats.goalkeepers.forEach(gk => {
      let teamName = "Desconocido";
      let logoUrl = "⚽";
      
      const team = registeredTeams.find(t => t.players?.some(p => p.id === gk.playerId));
      if (team) {
        teamName = team.name;
        logoUrl = team.logoUrl || "⚽";
      } else if (match) {
        if (gk.playerId.startsWith('custom_gk_h_') && match.homeTeamId) {
          const t = findTeam(match.homeTeamId);
          if (t) {
            teamName = t.name;
            logoUrl = t.logoUrl || "⚽";
          }
        } else if (gk.playerId.startsWith('custom_gk_a_') && match.awayTeamId) {
          const t = findTeam(match.awayTeamId);
          if (t) {
            teamName = t.name;
            logoUrl = t.logoUrl || "⚽";
          }
        }
      }

      // Si es un portero custom, usamos el nombre y el equipo como clave única
      const key = gk.playerId.startsWith('custom_')
        ? `custom_${gk.playerName.trim().toLowerCase()}_${teamName}`
        : gk.playerId;

      if (!gkTotals[key]) {
        gkTotals[key] = { name: gk.playerName, teamName, logoUrl, conceded: 0, matchesPlayed: 0 };
      }
      gkTotals[key].conceded += gk.goalsConceded;
      gkTotals[key].matchesPlayed += gk.matchesPlayed;
    });
  });

  // Convertir a arrays ordenados
  const scorersLeaderboard = Object.values(scorerTotals).sort((a, b) => b.goals - a.goals);
  const goalkeepersLeaderboard = Object.values(gkTotals)
    .map(gk => ({
      ...gk,
      average: gk.matchesPlayed > 0 ? Number((gk.conceded / gk.matchesPlayed).toFixed(2)) : 0
    }))
    .sort((a, b) => {
      // Ordenar por promedio menor a mayor. A igualdad, por más partidos jugados.
      if (a.average !== b.average) return a.average - b.average;
      return b.matchesPlayed - a.matchesPlayed;
    });

  // Abrir editor para un partido
  const handleOpenEditor = (match: Match) => {
    setSelectedMatch(match);
    
    // Obtener estadísticas guardadas previamente si existen
    const currentStats = matchStats[match.id] || { scorers: [], goalkeepers: [] };
    
    // Inicializar goleadores temporales en el modal
    setModalScorers(currentStats.scorers || []);
    
    // Resetear formularios de goleadores
    setHomeScorerId("");
    setCustomHomeScorer("");
    setHomeScorerGoals(1);

    setAwayScorerId("");
    setCustomAwayScorer("");
    setAwayScorerGoals(1);

    // Inicializar porteros (por defecto sugerimos vacio, con goles encajados = marcador del rival)
    const homeTeamObj = findTeam(match.homeTeamId);
    const awayTeamObj = findTeam(match.awayTeamId);

    const savedHomeGk = currentStats.goalkeepers.find(gk => {
      return homeTeamObj?.players?.some(p => p.id === gk.playerId) || gk.playerId.startsWith('custom_gk_h_') || false;
    });
    const savedAwayGk = currentStats.goalkeepers.find(gk => {
      return awayTeamObj?.players?.some(p => p.id === gk.playerId) || gk.playerId.startsWith('custom_gk_a_') || false;
    });

    if (savedHomeGk) {
      const isPlayerObj = homeTeamObj?.players?.find(p => p.id === savedHomeGk.playerId);
      if (isPlayerObj) {
        setHomeGkId(savedHomeGk.playerId);
        setCustomHomeGoalkeeper("");
      } else {
        setHomeGkId("custom");
        setCustomHomeGoalkeeper(savedHomeGk.playerName);
      }
      setHomeGkConceded(savedHomeGk.goalsConceded);
      setHomeGkMatches(savedHomeGk.matchesPlayed);
    } else {
      setHomeGkId("");
      setCustomHomeGoalkeeper("");
      setHomeGkConceded(match.awayScore ?? 0);
      setHomeGkMatches(1);
    }

    if (savedAwayGk) {
      const isPlayerObj = awayTeamObj?.players?.find(p => p.id === savedAwayGk.playerId);
      if (isPlayerObj) {
        setAwayGkId(savedAwayGk.playerId);
        setCustomAwayGoalkeeper("");
      } else {
        setAwayGkId("custom");
        setCustomAwayGoalkeeper(savedAwayGk.playerName);
      }
      setAwayGkConceded(savedAwayGk.goalsConceded);
      setAwayGkMatches(savedAwayGk.matchesPlayed);
    } else {
      setAwayGkId("");
      setCustomAwayGoalkeeper("");
      setAwayGkConceded(match.homeScore ?? 0);
      setAwayGkMatches(1);
    }
  };

  // Añadir goleador (guarda solo en estado temporal del modal)
  const handleAddScorer = (side: 'home' | 'away') => {
    if (!selectedMatch) return;
    const teamId = side === 'home' ? selectedMatch.homeTeamId : selectedMatch.awayTeamId;
    const teamObj = findTeam(teamId);
    if (!teamObj) return;

    const selectedPlayerId = side === 'home' ? homeScorerId : awayScorerId;
    const customVal = side === 'home' ? customHomeScorer.trim() : customAwayScorer.trim();
    const goalsVal = side === 'home' ? homeScorerGoals : awayScorerGoals;

    let pId = "";
    let pName = "";

    if (selectedPlayerId && selectedPlayerId !== 'custom') {
      const player = teamObj.players?.find(p => p.id === selectedPlayerId);
      if (!player) return;
      pId = player.id;
      pName = `${player.firstName} ${player.lastName}`;
    } else {
      if (!customVal) return;
      const prefix = side === 'home' ? 'custom_h_' : 'custom_a_';
      pId = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      pName = customVal;
    }

    setModalScorers(prev => {
      const updated = [...prev];
      const existingIndex = updated.findIndex(s => s.playerId === pId);
      if (existingIndex > -1) {
        updated[existingIndex].goals += goalsVal;
      } else {
        updated.push({ playerId: pId, playerName: pName, goals: goalsVal });
      }
      return updated;
    });

    // Resetear inputs de añadir goleador
    if (side === 'home') {
      setHomeScorerId("");
      setCustomHomeScorer("");
      setHomeScorerGoals(1);
    } else {
      setAwayScorerId("");
      setCustomAwayScorer("");
      setAwayScorerGoals(1);
    }
  };

  // Eliminar goleador (elimina solo del estado temporal del modal)
  const handleRemoveScorer = (pId: string) => {
    setModalScorers(prev => prev.filter(s => s.playerId !== pId));
  };

  // Compilar goleadores desde la lista actual y cualquier entrada pendiente en los selectores
  const getCompiledScorers = (): PlayerStats[] => {
    if (!selectedMatch) return modalScorers;
    let compiled = [...modalScorers];

    // Auto-añadir goleador local si se seleccionó en el dropdown pero no se pulsó "+"
    if (homeScorerId) {
      const teamObj = findTeam(selectedMatch.homeTeamId);
      if (teamObj) {
        let pId = "";
        let pName = "";
        if (homeScorerId !== 'custom') {
          const player = teamObj.players?.find(p => p.id === homeScorerId);
          if (player) {
            pId = player.id;
            pName = `${player.firstName} ${player.lastName}`;
          }
        } else if (customHomeScorer.trim()) {
          pId = `custom_h_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          pName = customHomeScorer.trim();
        }

        if (pId) {
          const existingIndex = compiled.findIndex(s => s.playerId === pId);
          if (existingIndex > -1) {
            compiled[existingIndex].goals += homeScorerGoals;
          } else {
            compiled.push({ playerId: pId, playerName: pName, goals: homeScorerGoals });
          }
        }
      }
    }

    // Auto-añadir goleador visitante si se seleccionó en el dropdown pero no se pulsó "+"
    if (awayScorerId) {
      const teamObj = findTeam(selectedMatch.awayTeamId);
      if (teamObj) {
        let pId = "";
        let pName = "";
        if (awayScorerId !== 'custom') {
          const player = teamObj.players?.find(p => p.id === awayScorerId);
          if (player) {
            pId = player.id;
            pName = `${player.firstName} ${player.lastName}`;
          }
        } else if (customAwayScorer.trim()) {
          pId = `custom_a_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          pName = customAwayScorer.trim();
        }

        if (pId) {
          const existingIndex = compiled.findIndex(s => s.playerId === pId);
          if (existingIndex > -1) {
            compiled[existingIndex].goals += awayScorerGoals;
          } else {
            compiled.push({ playerId: pId, playerName: pName, goals: awayScorerGoals });
          }
        }
      }
    }

    return compiled;
  };

  // Compilar porteros desde los inputs del formulario del modal
  const getCompiledGoalkeepers = (): GoalkeeperStats[] => {
    if (!selectedMatch) return [];
    const homeTeamObj = findTeam(selectedMatch.homeTeamId);
    const awayTeamObj = findTeam(selectedMatch.awayTeamId);
    const compiled: GoalkeeperStats[] = [];

    // Guardar portero local
    if (homeGkId && homeGkId !== 'custom') {
      const player = homeTeamObj?.players?.find(p => p.id === homeGkId);
      if (player) {
        compiled.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          goalsConceded: homeGkConceded,
          matchesPlayed: homeGkMatches
        });
      }
    } else if (customHomeGoalkeeper.trim()) {
      const gkName = customHomeGoalkeeper.trim();
      compiled.push({
        playerId: `custom_gk_h_${selectedMatch.id}`,
        playerName: gkName,
        goalsConceded: homeGkConceded,
        matchesPlayed: homeGkMatches
      });
    }

    // Guardar portero visitante
    if (awayGkId && awayGkId !== 'custom') {
      const player = awayTeamObj?.players?.find(p => p.id === awayGkId);
      if (player) {
        compiled.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          goalsConceded: awayGkConceded,
          matchesPlayed: awayGkMatches
        });
      }
    } else if (customAwayGoalkeeper.trim()) {
      const gkName = customAwayGoalkeeper.trim();
      compiled.push({
        playerId: `custom_gk_a_${selectedMatch.id}`,
        playerName: gkName,
        goalsConceded: awayGkConceded,
        matchesPlayed: awayGkMatches
      });
    }

    return compiled;
  };

  // Guardar tanto goleadores como porteros del partido y persistir
  const handleSaveAllStats = (closeModal: boolean) => {
    if (!selectedMatch) return;

    const compiledScorers = getCompiledScorers();
    const compiledGks = getCompiledGoalkeepers();

    // Actualizar el estado local para reflejar posibles auto-añadidos en la UI
    setModalScorers(compiledScorers);

    // Resetear campos de entrada de goleador
    setHomeScorerId("");
    setCustomHomeScorer("");
    setHomeScorerGoals(1);
    setAwayScorerId("");
    setCustomAwayScorer("");
    setAwayScorerGoals(1);

    setMatchStats(prev => {
      const newStats = {
        ...prev,
        [selectedMatch.id]: {
          matchId: selectedMatch.id,
          scorers: compiledScorers,
          goalkeepers: compiledGks
        }
      };

      if (onSaveTournament) {
        // Pasamos las nuevas estadísticas directamente para evitar el stale closure en Home
        setTimeout(() => {
          onSaveTournament(newStats);
        }, 100);
      }
      return newStats;
    });

    if (closeModal) {
      setSelectedMatch(null);
    } else {
      alert("✓ Goleadores y porteros guardados con éxito.");
    }
  };

  return (
    <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 p-6 rounded-none shadow-2xl flex flex-col gap-6">
      
      {/* Cabecera del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h2 className="font-header font-black text-lg uppercase tracking-wider text-white">
            Estadísticas y Premios Individuales del Torneo
          </h2>
        </div>

        {/* Botones de Navegación de Pestañas Internas */}
        <div className="flex bg-zinc-950 p-1 border border-zinc-850 gap-1 self-start md:self-auto">
          <button
            onClick={() => setInnerTab('scorers')}
            className={`py-1.5 px-4 text-[10px] font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
              innerTab === 'scorers' ? 'bg-yellow-400 text-black' : 'text-zinc-450 hover:text-white'
            }`}
          >
            Máximos Goleadores (Pichichi)
          </button>
          <button
            onClick={() => setInnerTab('goalkeepers')}
            className={`py-1.5 px-4 text-[10px] font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
              innerTab === 'goalkeepers' ? 'bg-yellow-400 text-black' : 'text-zinc-450 hover:text-white'
            }`}
          >
            Portero Zamora (Menos Goleado)
          </button>
          <button
            onClick={() => setInnerTab('matches')}
            className={`py-1.5 px-4 text-[10px] font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
              innerTab === 'matches' ? 'bg-yellow-400 text-black' : 'text-zinc-450 hover:text-white'
            }`}
          >
            Historial / Cargar Goles
          </button>
        </div>
      </div>

      {/* 1. SECCIÓN: TABLA DE GOLEADORES */}
      {innerTab === 'scorers' && (
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-950/60 p-4 border border-zinc-850">
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Aquí se muestran los goleadores en orden descendente. Haz clic en la pestaña <strong>"Historial / Cargar Goles"</strong> para registrar los anotadores de cada partido.
            </p>
          </div>

          <div className="border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 font-header font-bold text-[9px] tracking-widest uppercase">
                  <th className="p-3 text-center w-14">POS</th>
                  <th className="p-3">JUGADOR</th>
                  <th className="p-3">CLUB</th>
                  <th className="p-3 text-center w-28 text-yellow-400 font-black">GOLES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {scorersLeaderboard.length > 0 ? (
                  scorersLeaderboard.map((s, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/30 transition-colors">
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-none text-xs font-data font-black ${
                          idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-zinc-700 text-zinc-200' : idx === 2 ? 'bg-amber-800 text-amber-100' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3 font-header font-black text-sm uppercase text-white flex items-center gap-2">
                        {idx === 0 && <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />}
                        {s.name}
                      </td>
                      <td className="p-3 text-zinc-400 font-header font-bold uppercase text-[10px]">
                        <span className="mr-1.5">{s.logoUrl}</span>
                        {s.teamName}
                      </td>
                      <td className="p-3 text-center text-sm font-data font-black text-yellow-400 bg-yellow-400/5">
                        {s.goals}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-zinc-550 italic font-header text-xs uppercase tracking-wider">
                      Ningún gol registrado. Carga goles en la lista de partidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: TABLA DE PORTEROS */}
      {innerTab === 'goalkeepers' && (
        <div className="flex flex-col gap-4">
          <div className="bg-zinc-950/60 p-4 border border-zinc-850">
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              El premio Zamora al portero menos goleado se calcula ordenando a los guardametas por su promedio de goles encajados por partido (menor a mayor).
            </p>
          </div>

          <div className="border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-500 font-header font-bold text-[9px] tracking-widest uppercase">
                  <th className="p-3 text-center w-14">POS</th>
                  <th className="p-3">PORTERO</th>
                  <th className="p-3">CLUB</th>
                  <th className="p-3 text-center w-24">PARTIDOS</th>
                  <th className="p-3 text-center w-24">GOLES RECIBIDOS</th>
                  <th className="p-3 text-center w-32 text-yellow-400 font-black">PROMEDIO / PJ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {goalkeepersLeaderboard.length > 0 ? (
                  goalkeepersLeaderboard.map((gk, idx) => (
                    <tr key={idx} className="hover:bg-zinc-850/30 transition-colors">
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-none text-xs font-data font-black ${
                          idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-zinc-700 text-zinc-200' : idx === 2 ? 'bg-amber-800 text-amber-100' : 'bg-zinc-900 text-zinc-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-3 font-header font-black text-sm uppercase text-white flex items-center gap-2">
                        {idx === 0 && <Heart className="w-3.5 h-3.5 text-yellow-400 fill-current animate-pulse" />}
                        {gk.name}
                      </td>
                      <td className="p-3 text-zinc-400 font-header font-bold uppercase text-[10px]">
                        <span className="mr-1.5">{gk.logoUrl}</span>
                        {gk.teamName}
                      </td>
                      <td className="p-3 text-center text-zinc-300 font-data font-bold">
                        {gk.matchesPlayed}
                      </td>
                      <td className="p-3 text-center text-rose-400 font-data font-bold">
                        {gk.conceded}
                      </td>
                      <td className="p-3 text-center text-sm font-data font-black text-yellow-400 bg-yellow-400/5">
                        {gk.average.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-zinc-550 italic font-header text-xs uppercase tracking-wider">
                      Ningún portero registrado en las fichas de los partidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SECCIÓN: LISTA DE PARTIDOS PARA CARGAR GOLES */}
      {innerTab === 'matches' && (
        <div className="flex flex-col gap-8">
          <div className="bg-zinc-950/60 p-4 border border-zinc-850">
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Selecciona cualquier partido disputado de la fase de grupos o de la fase eliminatoria para registrar sus goleadores y porteros asociados.
            </p>
          </div>

          {/* FASE DE GRUPOS */}
          <div className="flex flex-col gap-4">
            <h3 className="font-header font-black text-sm uppercase tracking-wider text-yellow-400 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              Fase de Grupos
            </h3>
            
            {groupMatchesWithTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupMatchesWithTeams.map((match) => renderMatchCard(match))}
              </div>
            ) : (
              <div className="p-6 bg-zinc-950 border border-zinc-850 text-center text-xs text-zinc-500 italic font-header uppercase tracking-wider">
                No hay partidos de fase de grupos con equipos definidos.
              </div>
            )}
          </div>

          {/* FASE ELIMINATORIA */}
          <div className="flex flex-col gap-4">
            <h3 className="font-header font-black text-sm uppercase tracking-wider text-yellow-400 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Fase Eliminatoria (Árbol de Cruces)
            </h3>

            {knockoutMatchesWithTeams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {knockoutMatchesWithTeams.map((match) => renderMatchCard(match))}
              </div>
            ) : (
              <div className="p-6 bg-zinc-950 border border-zinc-850 text-center text-xs text-zinc-500 italic font-header uppercase tracking-wider">
                La fase eliminatoria no ha comenzado o no hay partidos con cruces definidos aún.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDITOR DE ESTADÍSTICAS DEL PARTIDO */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 p-6 max-w-3xl w-full flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-modal-scrollbar">
            <style>{`
              .custom-modal-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .custom-modal-scrollbar::-webkit-scrollbar-track {
                background: #09090b !important;
              }
              .custom-modal-scrollbar::-webkit-scrollbar-thumb {
                background: #27272a !important;
                border-radius: 3px !important;
              }
              .custom-modal-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #3f3f46 !important;
              }
            `}</style>
            
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-header font-black text-xs uppercase cursor-pointer"
            >
              Cerrar ×
            </button>

            {/* Cabecera del Editor */}
            <div className="border-b border-zinc-800 pb-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-header font-black text-yellow-400 uppercase tracking-widest">
                Editor de Acta y Estadísticas de Jugadores
              </span>
              <div className="flex items-center gap-3">
                <span className="font-header font-black text-lg uppercase text-white">
                  {findTeam(selectedMatch.homeTeamId)?.name}
                </span>
                <span className="font-data font-black text-sm bg-zinc-950 px-2 py-0.5 border border-zinc-800 text-yellow-400">
                  {selectedMatch.homeScore ?? 0} - {selectedMatch.awayScore ?? 0}
                </span>
                <span className="font-header font-black text-lg uppercase text-white">
                  {findTeam(selectedMatch.awayTeamId)?.name}
                </span>
              </div>
              <span className="text-[10px] text-zinc-550 font-sans uppercase">
                {selectedMatch.roundName} • {selectedMatch.pistaCampo || 'Pista TBD'}
              </span>
            </div>

            {/* Panel de Goleadores (Lado Local y Lado Visitante) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Lado Local */}
              <div className="flex flex-col gap-4 bg-zinc-950 p-4 border border-zinc-850">
                <span className="font-header font-black text-xs text-white border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                  <span>GOLEADORES: {findTeam(selectedMatch.homeTeamId)?.name}</span>
                  <span className="text-zinc-500 font-sans text-[10px]">Total: {selectedMatch.homeScore ?? 0} goles</span>
                </span>

                {/* Formulario Añadir Goleador Local */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      value={homeScorerId}
                      onChange={(e) => setHomeScorerId(e.target.value)}
                      className="flex-1 min-w-0 w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400 truncate"
                    >
                      <option value="">-- Seleccionar Goleador --</option>
                      {findTeam(selectedMatch.homeTeamId)?.players?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.dni ? `(${p.dni})` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Otro jugador (Escribir a mano) --</option>
                    </select>

                    <input 
                      type="number"
                      min="1"
                      value={homeScorerGoals}
                      onChange={(e) => setHomeScorerGoals(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-14 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold text-center px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      title="Goles anotados"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddScorer('home')}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 font-header font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {homeScorerId === 'custom' && (
                    <input
                      type="text"
                      value={customHomeScorer}
                      onChange={(e) => setCustomHomeScorer(e.target.value)}
                      placeholder="Nombre del goleador..."
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  )}
                </div>

                {/* Lista de goleadores locales añadidos */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[120px] pr-1">
                  {modalScorers
                    .filter(s => {
                      // Filtrar para el equipo local
                      return findTeam(selectedMatch.homeTeamId)?.players?.some(p => p.id === s.playerId) || s.playerId.startsWith('custom_h_') || false;
                    })
                    .map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-zinc-900/60 border border-zinc-900 text-xs">
                        <span className="font-header font-black text-zinc-300 uppercase">{s.playerName}</span>
                        <div className="flex items-center gap-3">
                           <span className="font-data font-black text-yellow-400 bg-yellow-400/5 px-2 py-0.5 border border-yellow-400/10">{s.goals} G</span>
                          <button
                            onClick={() => handleRemoveScorer(s.playerId)}
                            className="text-rose-500 hover:text-rose-400 text-[10px] font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Lado Visitante */}
              <div className="flex flex-col gap-4 bg-zinc-950 p-4 border border-zinc-850">
                <span className="font-header font-black text-xs text-white border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                  <span>GOLEADORES: {findTeam(selectedMatch.awayTeamId)?.name}</span>
                  <span className="text-zinc-500 font-sans text-[10px]">Total: {selectedMatch.awayScore ?? 0} goles</span>
                </span>

                {/* Formulario Añadir Goleador Visitante */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      value={awayScorerId}
                      onChange={(e) => setAwayScorerId(e.target.value)}
                      className="flex-1 min-w-0 w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400 truncate"
                    >
                      <option value="">-- Seleccionar Goleador --</option>
                      {findTeam(selectedMatch.awayTeamId)?.players?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.dni ? `(${p.dni})` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Otro jugador (Escribir a mano) --</option>
                    </select>

                    <input 
                      type="number"
                      min="1"
                      value={awayScorerGoals}
                      onChange={(e) => setAwayScorerGoals(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-14 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold text-center px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      title="Goles anotados"
                    />

                    <button
                      type="button"
                      onClick={() => handleAddScorer('away')}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black px-3 font-header font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {awayScorerId === 'custom' && (
                    <input
                      type="text"
                      value={customAwayScorer}
                      onChange={(e) => setCustomAwayScorer(e.target.value)}
                      placeholder="Nombre del goleador..."
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  )}
                </div>

                {/* Lista de goleadores visitantes añadidos */}
                <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[120px] pr-1">
                  {modalScorers
                    .filter(s => {
                      // Filtrar para el equipo visitante
                      return findTeam(selectedMatch.awayTeamId)?.players?.some(p => p.id === s.playerId) || s.playerId.startsWith('custom_a_') || false;
                    })
                    .map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-zinc-900/60 border border-zinc-900 text-xs">
                        <span className="font-header font-black text-zinc-300 uppercase">{s.playerName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-data font-black text-yellow-400 bg-yellow-400/5 px-2 py-0.5 border border-yellow-400/10">{s.goals} G</span>
                          <button
                            onClick={() => handleRemoveScorer(s.playerId)}
                            className="text-rose-500 hover:text-rose-400 text-[10px] font-bold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

            </div>

            {/* Botón guardar goleadores */}
            <button
              type="button"
              onClick={() => handleSaveAllStats(false)}
              className="w-full py-2 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 font-header font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer mb-2"
            >
              Guardar Goleadores del Partido
            </button>

            {/* SECCIÓN DE PORTEROS DEL PARTIDO */}
            <div className="flex flex-col gap-4 bg-zinc-950 p-4 border border-zinc-850">
              <span className="font-header font-black text-xs text-white border-b border-zinc-900 pb-1.5 flex justify-between items-center">
                <span>PORTEROS DE LA JORNADA</span>
                <span className="text-zinc-550 font-sans text-[10px]">Cargar goles encajados y partidos jugados</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Portero Local */}
                <div className="flex flex-col gap-3">
                  <span className="font-header font-bold text-[10px] text-zinc-400 uppercase">Portero Local (Defiende a {findTeam(selectedMatch.homeTeamId)?.name})</span>
                  <div className="flex flex-col gap-2">
                    <select
                      value={homeGkId}
                      onChange={(e) => setHomeGkId(e.target.value)}
                      className="h-8 px-2.5 min-w-0 w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:outline-none focus:ring-1 focus:ring-yellow-400 truncate"
                    >
                      <option value="">-- Seleccionar Portero --</option>
                      {findTeam(selectedMatch.homeTeamId)?.players?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.dni ? `(${p.dni})` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Otro jugador (Escribir a mano) --</option>
                    </select>

                    {homeGkId === 'custom' && (
                      <input
                        type="text"
                        value={customHomeGoalkeeper}
                        onChange={(e) => setCustomHomeGoalkeeper(e.target.value)}
                        placeholder="Nombre del portero..."
                        className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-1">
                        <label className="font-header text-[9px] uppercase text-zinc-550">Goles Encajados</label>
                        <input 
                          type="number"
                          min="0"
                          value={homeGkConceded}
                          onChange={(e) => setHomeGkConceded(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-header text-[9px] uppercase text-zinc-550">Partidos Jugados</label>
                        <input 
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={homeGkMatches}
                          onChange={(e) => setHomeGkMatches(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portero Visitante */}
                <div className="flex flex-col gap-3">
                  <span className="font-header font-bold text-[10px] text-zinc-400 uppercase">Portero Visitante (Defiende a {findTeam(selectedMatch.awayTeamId)?.name})</span>
                  <div className="flex flex-col gap-2">
                    <select
                      value={awayGkId}
                      onChange={(e) => setAwayGkId(e.target.value)}
                      className="h-8 px-2.5 min-w-0 w-full bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:outline-none focus:ring-1 focus:ring-yellow-400 truncate"
                    >
                      <option value="">-- Seleccionar Portero --</option>
                      {findTeam(selectedMatch.awayTeamId)?.players?.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName} {p.dni ? `(${p.dni})` : ''}
                        </option>
                      ))}
                      <option value="custom">-- Otro jugador (Escribir a mano) --</option>
                    </select>

                    {awayGkId === 'custom' && (
                      <input
                        type="text"
                        value={customAwayGoalkeeper}
                        onChange={(e) => setCustomAwayGoalkeeper(e.target.value)}
                        placeholder="Nombre del portero..."
                        className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:outline-none focus:ring-1 focus:ring-yellow-400"
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="flex flex-col gap-1">
                        <label className="font-header text-[9px] uppercase text-zinc-550">Goles Encajados</label>
                        <input 
                          type="number"
                          min="0"
                          value={awayGkConceded}
                          onChange={(e) => setAwayGkConceded(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none text-center"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="font-header text-[9px] uppercase text-zinc-550">Partidos Jugados</label>
                        <input 
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={awayGkMatches}
                          onChange={(e) => setAwayGkMatches(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón guardar porteros */}
              <button
                type="button"
                onClick={() => handleSaveAllStats(false)}
                className="w-full py-2 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/30 text-yellow-400 font-header font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer mt-2"
              >
                Guardar Porteros del Partido
              </button>
            </div>

            {/* Footer del Modal */}
            <div className="flex justify-end border-t border-zinc-800 pt-4">
              <button
                onClick={() => handleSaveAllStats(true)}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black uppercase text-xs tracking-wider transition-colors cursor-pointer"
              >
                Guardar y Finalizar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

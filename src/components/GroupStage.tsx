'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Group, Match, Team } from '@/types';
import { calculateStandings, generateRoundRobin, generateKnockoutMatches } from '@/utils/competition';
import { Trophy, Calendar, Sparkles, Shield, Shuffle, FileDown, Loader2, Award, ChevronRight, MapPin } from 'lucide-react';
import ExportButton from './ExportButton';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface GroupStageProps {
  groups: Group[];
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>;
  onTransitionToKnockout: (generatedMatches: Match[]) => void;
  isTransitionEnabled: boolean;
  registeredTeams: Team[];
}

export default function GroupStage({ 
  groups, 
  setGroups, 
  onTransitionToKnockout, 
  isTransitionEnabled,
  registeredTeams 
}: GroupStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const actaRef = useRef<HTMLDivElement>(null);

  // Estados para el Sorteo Parametrizado (Grupos Asimétricos)
  const [drawMode, setDrawMode] = useState<'manual' | 'auto'>('auto');
  const [numGroups, setNumGroups] = useState<number>(2); // Parámetro: Número de grupos
  const [tiebreaker, setTiebreaker] = useState<'points' | 'coef'>('points'); // Criterio de clasificación
  
  // Reglas de Clasificación para Eliminatorias
  const [directQualifiers, setDirectQualifiers] = useState<number>(2);
  const [wildcards, setWildcards] = useState<number>(0);
  
  const [teamAssignments, setTeamAssignments] = useState<Record<string, number>>({});
  const [drawTimestamp, setDrawTimestamp] = useState<string | null>(null);
  
  const [isExportingActa, setIsExportingActa] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // Estados para la Planificación de Horarios y Campos - Fase de Grupos
  const [startDate, setStartDate] = useState<string>('2026-06-25');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [matchDuration, setMatchDuration] = useState<number>(40); // 40 min por defecto
  const [breakDuration, setBreakDuration] = useState<number>(10); // 10 min por defecto
  const [numFields, setNumFields] = useState<number>(2); // 2 campos por defecto

  // Estados para la Planificación de Horarios y Campos - Fase Final / Cruces
  const [bracketStartDate, setBracketStartDate] = useState<string>('2026-06-26');
  const [bracketStartTime, setBracketStartTime] = useState<string>('09:00');
  const [bracketMatchDuration, setBracketMatchDuration] = useState<number>(40); // 40 min por defecto
  const [bracketBreakDuration, setBracketBreakDuration] = useState<number>(10); // 10 min por defecto
  const [bracketNumFields, setBracketNumFields] = useState<number>(2); // 2 campos por defecto

  // Efecto para actualizar bracketStartDate al día siguiente cuando cambia startDate
  useEffect(() => {
    try {
      const date = new Date(startDate);
      if (!isNaN(date.getTime())) {
        date.setDate(date.getDate() + 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        setBracketStartDate(`${yyyy}-${mm}-${dd}`);
      }
    } catch (e) {
      console.error(e);
    }
  }, [startDate]);

  // Cargar configuración de horarios específica del torneo de localStorage al montar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTId = localStorage.getItem('current_tournament_id') || 'default';
      const savedSched = localStorage.getItem(`tournament_sched_${activeTId}`);
      if (savedSched) {
        try {
          const parsed = JSON.parse(savedSched);
          if (parsed.startDate) setStartDate(parsed.startDate);
          if (parsed.startTime) setStartTime(parsed.startTime);
          if (parsed.matchDuration) setMatchDuration(parsed.matchDuration);
          if (parsed.breakDuration) setBreakDuration(parsed.breakDuration);
          if (parsed.numFields) setNumFields(parsed.numFields);
          
          if (parsed.bracketStartDate) setBracketStartDate(parsed.bracketStartDate);
          if (parsed.bracketStartTime) setBracketStartTime(parsed.bracketStartTime);
          if (parsed.bracketMatchDuration) setBracketMatchDuration(parsed.bracketMatchDuration);
          if (parsed.bracketBreakDuration) setBracketBreakDuration(parsed.bracketBreakDuration);
          if (parsed.bracketNumFields) setBracketNumFields(parsed.bracketNumFields);
        } catch (e) {
          console.error("Error parsing scheduling config:", e);
        }
      }
    }
  }, []);

  // Guardar configuración de horarios en localStorage al cambiar cualquier parámetro
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTId = localStorage.getItem('current_tournament_id') || 'default';
      const configObj = {
        startDate,
        startTime,
        matchDuration,
        breakDuration,
        numFields,
        bracketStartDate,
        bracketStartTime,
        bracketMatchDuration,
        bracketBreakDuration,
        bracketNumFields
      };
      localStorage.setItem(`tournament_sched_${activeTId}`, JSON.stringify(configObj));
    }
  }, [
    startDate, startTime, matchDuration, breakDuration, numFields,
    bracketStartDate, bracketStartTime, bracketMatchDuration, bracketBreakDuration, bracketNumFields
  ]);

  // Función auxiliar para calcular las horas de inicio/fin de cada grupo en los campos
  const getGroupScheduleInfo = (groupIndex: number) => {
    const fieldIndex = groupIndex % numFields;
    const fieldName = `Campo ${fieldIndex + 1}`;
    
    // Contar cuántos partidos se juegan en este campo antes de este grupo
    let matchesBefore = 0;
    for (let i = 0; i < groupIndex; i++) {
      if (i % numFields === fieldIndex) {
        const groupTeams = registeredTeams.filter(t => teamAssignments[t.id] === i);
        const n = groupTeams.length;
        const matchesInGroup = n > 1 ? (n * (n - 1)) / 2 : 0;
        matchesBefore += matchesInGroup;
      }
    }
    
    const groupTeams = registeredTeams.filter(t => teamAssignments[t.id] === groupIndex);
    const n = groupTeams.length;
    if (n <= 1) {
      return {
        fieldName,
        startTimeStr: '--:--',
        endTimeStr: '--:--',
        matchesCount: 0
      };
    }
    const matchesInGroup = (n * (n - 1)) / 2;

    const dateStr = `${startDate}T${startTime}`;
    const baseDate = new Date(dateStr);
    
    const startMs = baseDate.getTime() + matchesBefore * (matchDuration + breakDuration) * 60000;
    const endMs = startMs + matchesInGroup * (matchDuration + breakDuration) * 60000 - (breakDuration * 60000);
    
    const startDateObj = new Date(startMs);
    const endDateObj = new Date(endMs);
    
    const formatTime = (d: Date) => {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return {
      fieldName,
      startTimeStr: formatTime(startDateObj),
      endTimeStr: formatTime(endDateObj),
      matchesCount: matchesInGroup
    };
  };

  // Inicializar asignaciones de grupo secuencialmente por defecto
  useEffect(() => {
    const initial: Record<string, number> = {};
    registeredTeams.forEach((team, index) => {
      initial[team.id] = index % numGroups;
    });
    setTeamAssignments(initial);
  }, [registeredTeams, numGroups]);

  // Algoritmo de Sorteo Asimétrico Fisher-Yates (Sin validación estricta)
  const performRandomDraw = () => {
    const shuffledTeams = [...registeredTeams];
    
    // Mezcla aleatoria Fisher-Yates
    for (let i = shuffledTeams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledTeams[i], shuffledTeams[j]] = [shuffledTeams[j], shuffledTeams[i]];
    }

    // Reparto Round-Robin en los grupos (Diferencia máxima de 1 equipo entre grupos)
    const newAssignments: Record<string, number> = {};
    shuffledTeams.forEach((team, index) => {
      const groupIndex = index % numGroups;
      newAssignments[team.id] = groupIndex;
    });

    setTeamAssignments(newAssignments);
    setDrawTimestamp(new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'medium' }));
  };

  // Confirmar y generar calendarios round-robin para todos los grupos sorteados (según criterio elegido)
  const confirmAndGenerateCalendar = () => {
    const groupNames = Array.from({ length: numGroups }, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`);
    
    // Preparar el tiempo para cada campo
    const fieldsTimes = Array.from({ length: numFields }, () => {
      const dateStr = `${startDate}T${startTime}`;
      return new Date(dateStr);
    });

    const newGroups: Group[] = groupNames.map((name, gIdx) => {
      const groupTeams = registeredTeams.filter(t => teamAssignments[t.id] === gIdx);
      const groupId = `group-${String.fromCharCode(97 + gIdx)}`;
      
      // Asignar el campo para este grupo
      const fieldIndex = gIdx % numFields;
      const fieldName = `Campo ${fieldIndex + 1}`;

      const rawMatches = generateRoundRobin(groupTeams, 'fase-grupos', groupId);
      
      // Enriquecer los partidos con fechaHora y pistaCampo secuencialmente
      const matches = rawMatches.map((m) => {
        const matchTime = new Date(fieldsTimes[fieldIndex]);
        
        // Convertir a formato datetime-local compatible local (YYYY-MM-DDTHH:mm)
        const pad = (num: number) => String(num).padStart(2, '0');
        const matchTimeLocalStr = `${matchTime.getFullYear()}-${pad(matchTime.getMonth() + 1)}-${pad(matchTime.getDate())}T${pad(matchTime.getHours())}:${pad(matchTime.getMinutes())}`;
        
        // Avanzar el tiempo para el siguiente partido de este campo
        fieldsTimes[fieldIndex] = new Date(fieldsTimes[fieldIndex].getTime() + (matchDuration + breakDuration) * 60000);
        
        return {
          ...m,
          fechaHora: matchTimeLocalStr,
          pistaCampo: fieldName,
        };
      });
      
      return {
        id: groupId,
        phaseId: 'fase-grupos',
        name,
        teams: groupTeams,
        standings: calculateStandings(groupTeams, matches, tiebreaker),
        matches
      };
    });

    setGroups(newGroups);
  };

  // Recalcular ordenación al cambiar el criterio de desempate en caliente
  useEffect(() => {
    if (groups.length === 0) return;
    
    const updatedGroups = groups.map(g => ({
      ...g,
      standings: calculateStandings(g.teams, g.matches, tiebreaker)
    }));
    
    setGroups(updatedGroups);
  }, [tiebreaker]);

  // Exportar el Acta oficial en PDF utilizando html-to-image y jsPDF
  const exportActaPDF = async () => {
    if (!actaRef.current) return;
    setIsExportingActa(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(actaRef.current, {
        quality: 1,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 en mm
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Acta_Oficial_Sorteo_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error al exportar acta en PDF:', error);
    } finally {
      setIsExportingActa(false);
    }
  };

  const handleScoreChange = (groupId: string, matchId: string, side: 'home' | 'away', val: string) => {
    const score = val === '' ? undefined : parseInt(val, 10);
    if (score !== undefined && isNaN(score)) return;

    const updatedGroups = groups.map(g => {
      if (g.id !== groupId) return g;

      const updatedMatches = g.matches.map(m => {
        if (m.id !== matchId) return m;

        const updatedMatch = { ...m };
        if (side === 'home') updatedMatch.homeScore = score;
        else updatedMatch.awayScore = score;

        if (updatedMatch.homeScore !== undefined && updatedMatch.awayScore !== undefined) {
          updatedMatch.status = 'played';
        } else {
          updatedMatch.status = 'scheduled';
        }

        return updatedMatch;
      });

      return {
        ...g,
        matches: updatedMatches,
        standings: calculateStandings(g.teams, updatedMatches, tiebreaker)
      };
    });

    setGroups(updatedGroups);
  };

  const handleMatchScheduleChange = (groupId: string, matchId: string, field: 'fechaHora' | 'pistaCampo', value: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        matches: g.matches.map(m => {
          if (m.id !== matchId) return m;
          return {
            ...m,
            [field]: value
          };
        })
      };
    }));
  };

  const getBracketSchedulePreview = () => {
    const n = directQualifiers * numGroups + wildcards;
    if (n <= 1) {
      return [];
    }

    // Potencia de 2
    let bracketSize = 2;
    while (bracketSize < n) {
      bracketSize *= 2;
    }

    const numRounds = Math.log2(bracketSize);
    const roundsInfo: { name: string; startTimeStr: string; endTimeStr: string; matchesCount: number }[] = [];

    const startDateTimeStr = `${bracketStartDate}T${bracketStartTime}`;
    let roundStartDateTime = new Date(startDateTimeStr);

    const formatTime = (d: Date) => {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (d: Date) => {
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    };

    for (let L = numRounds - 1; L >= 0; L--) {
      const numMatches = Math.pow(2, L);
      let roundName = '';
      if (L === 0) roundName = 'Final';
      else if (L === 1) roundName = 'Semifinales';
      else if (L === 2) roundName = 'Cuartos de final';
      else if (L === 3) roundName = 'Octavos de final';
      else if (L === 4) roundName = 'Dieciseisavos de final';
      else roundName = `Ronda de ${numMatches * 2}`;

      const fieldsTimes = Array.from({ length: bracketNumFields }, () => new Date(roundStartDateTime));
      let maxRoundEndMs = roundStartDateTime.getTime();

      for (let i = 0; i < numMatches; i++) {
        const fieldIdx = i % bracketNumFields;
        const matchTime = new Date(fieldsTimes[fieldIdx]);
        const matchEndMs = matchTime.getTime() + (bracketMatchDuration * 60000);
        if (matchEndMs > maxRoundEndMs) {
          maxRoundEndMs = matchEndMs;
        }
        fieldsTimes[fieldIdx] = new Date(matchTime.getTime() + (bracketMatchDuration + bracketBreakDuration) * 60000);
      }

      const roundEndDateTime = new Date(maxRoundEndMs);

      roundsInfo.push({
        name: roundName,
        startTimeStr: `${formatDate(roundStartDateTime)} ${formatTime(roundStartDateTime)}`,
        endTimeStr: `${formatDate(roundEndDateTime)} ${formatTime(roundEndDateTime)}`,
        matchesCount: numMatches
      });

      roundStartDateTime = new Date(maxRoundEndMs);
    }

    return roundsInfo;
  };

  const handleGenerateBracket = () => {
    if (groups.length === 0) return;

    // 1. Obtener todos los clasificados directos de todos los grupos.
    const directTeamsList: { team: Team; standing: any }[] = [];
    const wildcardCandidates: { team: Team; standing: any }[] = [];

    groups.forEach(g => {
      const getTeamById = (id: string) => g.teams.find(t => t.id === id)!;
      
      g.standings.forEach((standing, idx) => {
        const team = getTeamById(standing.teamId);
        if (!team) return;
        if (idx < directQualifiers) {
          directTeamsList.push({ team, standing });
        } else {
          wildcardCandidates.push({ team, standing });
        }
      });
    });

    // Ordenar clasificados directos por mérito deportivo:
    // Primero por posición en su grupo, luego por puntos/coeficiente.
    directTeamsList.sort((a, b) => {
      // Buscar la posición de cada uno en su respectivo grupo
      const groupA = groups.find(g => g.teams.some(t => t.id === a.team.id));
      const groupB = groups.find(g => g.teams.some(t => t.id === b.team.id));
      
      const posA = groupA?.standings.findIndex(s => s.teamId === a.team.id) ?? 0;
      const posB = groupB?.standings.findIndex(s => s.teamId === b.team.id) ?? 0;

      if (posA !== posB) return posA - posB; // Posición más baja primero (0, 1, 2...)
      
      // Si tienen la misma posición, desempatar por el criterio seleccionado (tiebreaker)
      if (tiebreaker === 'coef') {
        if (b.standing.coef !== a.standing.coef) return b.standing.coef - a.standing.coef;
        return b.standing.coefGoles - a.standing.coefGoles;
      } else {
        if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
        const gdA = a.standing.goalsFor - a.standing.goalsAgainst;
        const gdB = b.standing.goalsFor - b.standing.goalsAgainst;
        return gdB - gdA;
      }
    });

    // Ordenar los candidatos a wildcards (mejores terceros/cuartos, etc.) por su rendimiento
    wildcardCandidates.sort((a, b) => {
      if (tiebreaker === 'coef') {
        if (b.standing.coef !== a.standing.coef) return b.standing.coef - a.standing.coef;
        return b.standing.coefGoles - a.standing.coefGoles;
      } else {
        if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
        const gdA = a.standing.goalsFor - a.standing.goalsAgainst;
        const gdB = b.standing.goalsFor - b.standing.goalsAgainst;
        return gdB - gdA;
      }
    });

    // Seleccionar la cantidad de wildcards configurada
    const wildcardTeams = wildcardCandidates.slice(0, wildcards);

    // Consolidar la lista completa de clasificados en orden de mérito deportivo
    const allQualifiedTeams = [
      ...directTeamsList.map(item => item.team),
      ...wildcardTeams.map(item => item.team)
    ];

    // Generar el árbol de partidos eliminatorios
    const generatedMatches = generateKnockoutMatches(allQualifiedTeams, 'fase-eliminatorias');

    // Enriquecer los partidos con fechaHora y pistaCampo secuencialmente ronda por ronda
    const roundNamesInOrder: string[] = [];
    generatedMatches.forEach(m => {
      if (!roundNamesInOrder.includes(m.roundName)) {
        roundNamesInOrder.push(m.roundName);
      }
    });

    const startDateTimeStr = `${bracketStartDate}T${bracketStartTime}`;
    let roundStartDateTime = new Date(startDateTimeStr);

    roundNamesInOrder.forEach((rName) => {
      const roundMatches = generatedMatches.filter(m => m.roundName === rName);
      const fieldsTimes = Array.from({ length: bracketNumFields }, () => new Date(roundStartDateTime));
      let maxRoundEndMs = roundStartDateTime.getTime();

      roundMatches.forEach((match, idx) => {
        const fieldIdx = idx % bracketNumFields;
        const fieldName = `Campo ${fieldIdx + 1}`;
        const matchTime = new Date(fieldsTimes[fieldIdx]);

        const pad = (num: number) => String(num).padStart(2, '0');
        const matchTimeLocalStr = `${matchTime.getFullYear()}-${pad(matchTime.getMonth() + 1)}-${pad(matchTime.getDate())}T${pad(matchTime.getHours())}:${pad(matchTime.getMinutes())}`;

        match.fechaHora = matchTimeLocalStr;
        match.pistaCampo = fieldName;

        const matchEndMs = matchTime.getTime() + (bracketMatchDuration * 60000);
        if (matchEndMs > maxRoundEndMs) {
          maxRoundEndMs = matchEndMs;
        }

        fieldsTimes[fieldIdx] = new Date(matchTime.getTime() + (bracketMatchDuration + bracketBreakDuration) * 60000);
      });

      // La siguiente ronda comienza al finalizar la anterior
      roundStartDateTime = new Date(maxRoundEndMs);
    });
    
    // Avanzar a la fase final pasándole los partidos generados
    onTransitionToKnockout(generatedMatches);
  };

  const groupNames = Array.from({ length: numGroups }, (_, i) => `Grupo ${String.fromCharCode(65 + i)}`);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      
      {/* SECCIÓN: Organizador de Sorteo Asimétrico */}
      <div className="w-full max-w-6xl bg-zinc-900 border border-zinc-800 p-6 rounded-none no-print shadow-2xl flex flex-col gap-6">
        
        {/* Cabecera del Panel */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4 text-yellow-400 animate-pulse" />
            <h2 className="font-header font-black text-sm uppercase tracking-wider text-white">
              Bombo de Sorteo (Reparto Inteligente Asimétrico)
            </h2>
          </div>
          <span className="font-header font-bold text-[10px] uppercase text-zinc-550">
            Equipos Registrados: {registeredTeams.length}
          </span>
        </div>

        {/* Inputs de Configuración Parametrizada */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-850">
          <div className="flex flex-col gap-1">
            <label className="font-header font-black text-[10px] uppercase text-zinc-450 tracking-wider">Número de Grupos</label>
            <input
              type="number"
              min="1"
              max="8"
              value={numGroups}
              onChange={(e) => setNumGroups(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 justify-end">
            <span className="text-[10px] font-header font-black uppercase text-zinc-500 mb-1">Distribución estimada:</span>
            <div className="h-9 flex items-center px-3 bg-zinc-900/40 border border-zinc-850 text-xs font-mono text-zinc-400">
              {registeredTeams.length} equipos en {numGroups} grupos ⇒ {' '}
              {Array.from({ length: numGroups }, (_, i) => {
                const count = Math.floor(registeredTeams.length / numGroups) + (i < (registeredTeams.length % numGroups) ? 1 : 0);
                return count;
              }).join(', ')} por grupo
            </div>
          </div>
        </div>

        {/* Modo Manual o Automático */}
        <div className="grid grid-cols-2 bg-zinc-950 p-1 border border-zinc-850 gap-1 self-start">
          <button
            onClick={() => setDrawMode('auto')}
            className={`py-2 px-6 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
              drawMode === 'auto'
                ? 'bg-yellow-400 text-black font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sorteo Automático
          </button>
          <button
            onClick={() => setDrawMode('manual')}
            className={`py-2 px-6 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
              drawMode === 'manual'
                ? 'bg-yellow-400 text-black font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Asignación Manual
          </button>
        </div>

        {/* Panel de Sorteo Automático */}
        {drawMode === 'auto' && (
          <div className="flex flex-col gap-4 bg-zinc-950/40 p-4 border border-zinc-850">
            <p className="text-xs text-zinc-450 leading-relaxed font-sans max-w-2xl">
              El sorteo repartirá equitativamente los equipos. Si el total no es divisible, el algoritmo asimétrico distribuirá secuencialmente el sobrante, manteniendo una diferencia máxima de 1 club por grupo.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={performRandomDraw}
                className="flex items-center gap-2 text-xs px-5 py-2.5 bg-yellow-400 hover:bg-yellow-50 text-black font-header font-black uppercase tracking-tight transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Ejecutar Sorteo Inteligente
              </button>

              {drawTimestamp && (
                <button
                  onClick={exportActaPDF}
                  disabled={isExportingActa}
                  className="flex items-center gap-2 text-xs px-5 py-2.5 bg-zinc-950 text-white border border-zinc-800 hover:bg-zinc-900 font-header font-black uppercase tracking-tight transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExportingActa ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Descargar Acta de Sorteo (PDF)
                </button>
              )}
            </div>

            {drawTimestamp && (
              <div className="text-xs font-sans text-emerald-400 mt-1 flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Sorteo certificado e inmutable el {drawTimestamp}
              </div>
            )}
          </div>
        )}

        {/* Panel de Asignación Manual */}
        {drawMode === 'manual' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {registeredTeams.map(team => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-850">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-sm">{team.logoUrl}</span>
                  <span className="font-header font-black uppercase text-xs truncate text-zinc-300">{team.name}</span>
                </div>
                <select
                  value={teamAssignments[team.id] ?? 0}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTeamAssignments(prev => ({ ...prev, [team.id]: val }));
                  }}
                  className="bg-zinc-900 border border-zinc-800 text-white text-[10px] font-header font-bold px-2 py-1 focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                >
                  {groupNames.map((name, idx) => (
                    <option key={idx} value={idx}>{name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Vista previa de los grupos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {groupNames.map((name, gIdx) => {
            const groupTeams = registeredTeams.filter(t => teamAssignments[t.id] === gIdx);
            return (
              <div key={gIdx} className="bg-zinc-950/60 border border-zinc-850 p-4">
                <h4 className="font-header font-black text-[10px] tracking-wider uppercase text-yellow-400 border-b border-zinc-800 pb-2 mb-2">
                  {name} ({groupTeams.length})
                </h4>
                <div className="flex flex-col gap-1.5">
                  {groupTeams.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5 text-[10px] uppercase font-header font-bold text-zinc-400">
                      <span>{t.logoUrl}</span>
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                  {groupTeams.length === 0 && (
                    <span className="text-[10px] text-zinc-650 italic">Sin equipos</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CONFIGURACIÓN DE HORARIOS Y PISTAS */}
        <div className="flex flex-col gap-6 bg-zinc-950 p-6 border border-zinc-850 mt-2">
          <h3 className="font-header font-black text-sm uppercase tracking-wider text-yellow-400 border-b border-zinc-800 pb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Planificación de Calendario Temporal y Distribución de Campos
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* DÍA 1: FASE DE GRUPOS */}
            <div className="flex flex-col gap-4 bg-zinc-900/20 p-4 border border-zinc-850/70">
              <h4 className="font-header font-black text-xs uppercase tracking-widest text-white border-b border-zinc-850 pb-2 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-none"></span> DÍA 1: FASE DE GRUPOS
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Fecha</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Hora Inicio</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Campos</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numFields}
                    onChange={(e) => setNumFields(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Duración (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={matchDuration}
                    onChange={(e) => setMatchDuration(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Descanso (min)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* DÍA 2: FASE FINAL / CRUCES */}
            <div className="flex flex-col gap-4 bg-zinc-900/20 p-4 border border-zinc-850/70">
              <h4 className="font-header font-black text-xs uppercase tracking-widest text-yellow-400 border-b border-zinc-850 pb-2 mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-none"></span> DÍA 2: FASE FINAL / CRUCES
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Fecha</label>
                  <input
                    type="date"
                    value={bracketStartDate}
                    onChange={(e) => setBracketStartDate(e.target.value)}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Hora Inicio</label>
                  <input
                    type="time"
                    value={bracketStartTime}
                    onChange={(e) => setBracketStartTime(e.target.value)}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Campos</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={bracketNumFields}
                    onChange={(e) => setBracketNumFields(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Duración (min)</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={bracketMatchDuration}
                    onChange={(e) => setBracketMatchDuration(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-450 tracking-wider">Descanso (min)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={bracketBreakDuration}
                    onChange={(e) => setBracketBreakDuration(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Previsualización Doble */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
            {/* Previsualización Fase de Grupos */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 flex flex-col gap-3">
              <span className="font-header font-black text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-850 pb-1">
                VISTA PREVIA: FASE DE GRUPOS (DÍA 1)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {groupNames.map((name, gIdx) => {
                  const info = getGroupScheduleInfo(gIdx);
                  return (
                    <div key={gIdx} className="bg-zinc-950 p-2.5 border border-zinc-850/60 flex flex-col gap-1">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1 mb-0.5">
                        <span className="font-header font-black text-[9px] text-white uppercase">{name}</span>
                        <span className="font-header font-black text-[8px] text-yellow-400 uppercase bg-yellow-400/5 px-1 border border-yellow-400/10">{info.fieldName}</span>
                      </div>
                      <div className="flex flex-col text-[9px] font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span>Horario:</span>
                          <span className="font-bold text-zinc-200">{info.startTimeStr} - {info.endTimeStr}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Partidos:</span>
                          <span className="font-bold text-zinc-200">{info.matchesCount}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previsualización Fase Final */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-4 flex flex-col gap-3">
              <span className="font-header font-black text-[10px] uppercase tracking-wider text-yellow-400 border-b border-zinc-850 pb-1">
                VISTA PREVIA: FASE FINAL / CRUCES (DÍA 2)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {getBracketSchedulePreview().length > 0 ? (
                  getBracketSchedulePreview().map((round, rIdx) => (
                    <div key={rIdx} className="bg-zinc-950 p-2.5 border border-zinc-850/60 flex flex-col gap-1">
                      <div className="flex justify-between items-center border-b border-zinc-900 pb-1 mb-0.5">
                        <span className="font-header font-black text-[9px] text-white uppercase truncate max-w-[120px]">{round.name}</span>
                        <span className="font-header font-black text-[8px] text-yellow-400 uppercase bg-yellow-400/5 px-1 border border-yellow-400/10">Ronda</span>
                      </div>
                      <div className="flex flex-col text-[9px] font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span>Horario:</span>
                          <span className="font-bold text-zinc-200">{round.startTimeStr.split(' ')[1]} - {round.endTimeStr.split(' ')[1]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fecha:</span>
                          <span className="font-bold text-zinc-200">{round.startTimeStr.split(' ')[0]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Partidos:</span>
                          <span className="font-bold text-zinc-200">{round.matchesCount}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-[10px] text-zinc-500 italic p-2">Configura más de 1 equipo para ver el preview de cruces.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Confirmar y Generar Calendarios */}
        <button
          onClick={confirmAndGenerateCalendar}
          className="w-full py-3 bg-yellow-400 text-black hover:bg-yellow-500 font-header font-black uppercase tracking-wider transition-all cursor-pointer border border-yellow-300/10 text-center"
        >
          Confirmar Grupos y Generar Calendario Oficial
        </button>
      </div>

      {/* Resultados de la Competición */}
      {groups.length > 0 && (
        <>
          <div className="flex justify-between items-center w-full max-w-6xl no-print">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <h2 className="font-header font-black text-sm uppercase tracking-wider text-zinc-350">Calendario & Tabla de Clasificación</h2>
              
              {/* Dropdown de Selección de Criterio de Ordenación */}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-none no-print ml-4">
                <span className="font-header font-bold text-[10px] text-zinc-500 uppercase">Clasificación por:</span>
                <select
                  value={tiebreaker}
                  onChange={(e) => setTiebreaker(e.target.value as 'points' | 'coef')}
                  className="bg-zinc-950 border-none text-white text-[10px] font-header font-bold focus:outline-none cursor-pointer"
                >
                  <option value="points">PUNTOS TOTALES (ESTÁNDAR)</option>
                  <option value="coef">PROMEDIO / COEFICIENTE (ASIMÉTRICOS)</option>
                </select>
              </div>
            </div>
            <ExportButton 
              elementRef={containerRef} 
              fileName="Clasificacion_Fase_de_Grupos" 
              onBeforeExport={() => setIsExporting(true)}
              onAfterExport={() => setIsExporting(false)}
            />
          </div>

          <div 
            ref={containerRef}
            className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-none p-8 flex flex-col gap-10 transition-all duration-300 relative overflow-hidden"
          >
            <style>{`
              .export-mode {
                width: 1440px !important;
                max-width: 1440px !important;
                min-width: 1440px !important;
                padding: 32px !important;
              }
              .export-mode .export-grid-2col {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 32px !important;
              }
              .export-mode .export-rounds-grid {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 20px !important;
                align-items: start !important;
              }
              .export-mode .no-print {
                display: none !important;
              }
            `}</style>
            
            <div className="text-center border-b border-zinc-800 pb-6 relative z-10">
              <span className="font-header font-black text-xs uppercase tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-none">
                FASE DE GRUPOS
              </span>
              <h1 className="font-header font-black text-4xl text-white uppercase tracking-tight mt-3">
                Clasificación Oficial y Jornadas
              </h1>
              <p className="font-header text-xs uppercase tracking-wider text-zinc-550 font-bold mt-1">
                Ordenado por: {tiebreaker === 'points' ? 'Puntos Totales' : 'Coeficiente de Rendimiento (Puntos / PJ)'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 export-grid-2col">
              {groups.map((group) => (
                <div key={group.id} className="flex flex-col gap-8">
                  
                  {/* Tabla de clasificación */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 shadow-xl">
                    <h3 className="font-header font-black text-lg text-white mb-5 pb-3 border-b border-zinc-800 uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" /> {group.name}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="font-header text-zinc-550 font-bold border-b border-zinc-800 uppercase text-[9px] tracking-wider">
                            <th className="py-2.5 text-center w-8">Pos</th>
                            <th className="py-2.5">Club</th>
                            <th className="py-2.5 text-center w-8">PJ</th>
                            <th className="py-2.5 text-center w-8">PG</th>
                            <th className="py-2.5 text-center w-8">PE</th>
                            <th className="py-2.5 text-center w-8">PP</th>
                            <th className="py-2.5 text-center w-8 text-zinc-600 font-bold">GF</th>
                            <th className="py-2.5 text-center w-8 text-zinc-600 font-bold">GC</th>
                            <th className="py-2.5 text-center w-12 text-zinc-500 font-bold">PTS</th>
                            <th className="py-2.5 text-center w-14 text-yellow-400 font-black">COEF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {group.standings.map((standing, index) => {
                            const team = group.teams.find(t => t.id === standing.teamId)!;
                            const isQualified = index < 2;
                            return (
                              <tr 
                                key={standing.teamId} 
                                className={`hover:bg-zinc-850/50 transition-colors group ${
                                  isQualified ? 'bg-yellow-400/5' : ''
                                }`}
                              >
                                <td className="py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-none text-[10px] font-data font-black tracking-wider ${
                                    index === 0 
                                      ? 'bg-yellow-400 text-black font-black' 
                                      : index === 1 
                                        ? 'bg-zinc-700 text-zinc-100' 
                                        : 'bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="py-3 font-header font-black uppercase text-sm text-zinc-200 flex items-center gap-2.5">
                                  <div className="w-7 h-7 bg-zinc-950 rounded-none flex items-center justify-center text-sm border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                    {team.logoUrl}
                                  </div>
                                  <span className="truncate group-hover:text-white transition-colors">{team.name}</span>
                                </td>
                                <td className="py-3 text-center font-data font-bold text-zinc-400">{standing.played}</td>
                                <td className="py-3 text-center font-data text-emerald-400 font-bold">{standing.won}</td>
                                <td className="py-3 text-center font-data text-amber-400 font-bold">{standing.drawn}</td>
                                <td className="py-3 text-center font-data text-rose-400 font-bold">{standing.lost}</td>
                                <td className="py-3 text-center font-data text-zinc-550">{standing.goalsFor}</td>
                                <td className="py-3 text-center font-data text-zinc-550">{standing.goalsAgainst}</td>
                                <td className="py-3 text-center font-data text-zinc-400">{standing.points}</td>
                                <td className="py-3 text-center font-data text-yellow-400 font-black text-sm bg-yellow-400/5">{(standing.coef ?? 0).toFixed(3)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calendario */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-none p-6 shadow-xl flex flex-col gap-5">
                    <h4 className="font-header font-black text-xs uppercase text-zinc-400 tracking-widest border-b border-zinc-800 pb-2">
                      Partidos y Marcadores
                    </h4>
                    <div className="flex flex-col gap-4 export-rounds-grid">
                      {Array.from(new Set(group.matches.map(m => m.roundName))).map(roundName => (
                        <div key={roundName} className="flex flex-col gap-2.5">
                          <div className="font-header font-black text-[10px] text-yellow-400 bg-yellow-400/10 py-1.5 px-3 rounded-none border border-yellow-400/20 uppercase tracking-widest inline-block self-start">
                            {roundName}
                          </div>
                          <div className="flex flex-col gap-2">
                            {group.matches.filter(m => m.roundName === roundName).map(match => {
                              const homeTeam = group.teams.find(t => t.id === match.homeTeamId)!;
                              const awayTeam = group.teams.find(t => t.id === match.awayTeamId)!;
                              return (
                                <div 
                                  key={match.id} 
                                  className="flex flex-col bg-zinc-950 border border-zinc-850 rounded-none hover:border-zinc-700 hover:bg-zinc-900 transition-all p-3 gap-2"
                                >
                                  {/* Cabecera de Horario y Campo */}
                                  {/* Cabecera de Horario y Campo Editable */}
                                  <div className="flex justify-between items-center text-[10px] border-b border-zinc-900/60 pb-2 mb-1.5 gap-2">
                                    <div className="flex items-center gap-1.5 w-7/12">
                                      <Calendar className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                      {isExporting ? (
                                        <span className="text-[11px] text-yellow-450 font-mono font-black px-1.5 py-0.5 leading-none select-none">
                                          {match.fechaHora ? formatMatchDate(match.fechaHora) : '—'}
                                        </span>
                                      ) : (
                                        <input
                                          type="datetime-local"
                                          value={match.fechaHora || ''}
                                          onChange={(e) => handleMatchScheduleChange(group.id, match.id, 'fechaHora', e.target.value)}
                                          className="bg-transparent hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent hover:border-zinc-800 focus:border-yellow-400/40 text-[11px] text-yellow-450 font-mono font-black px-1.5 py-0.5 rounded-none w-full focus:outline-none transition-all cursor-pointer"
                                        />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 w-5/12 justify-end">
                                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                      {isExporting ? (
                                        <span className="text-[10px] text-zinc-200 font-header font-black uppercase text-right leading-none select-none">
                                          {match.pistaCampo || '—'}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={match.pistaCampo || ''}
                                          placeholder="CAMPO/PISTA"
                                          onChange={(e) => handleMatchScheduleChange(group.id, match.id, 'pistaCampo', e.target.value)}
                                          className="bg-transparent hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent hover:border-zinc-800 focus:border-yellow-400/40 text-[10px] text-zinc-200 font-header font-black uppercase text-right px-1.5 py-0.5 rounded-none w-full focus:outline-none transition-all cursor-text"
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Contenido del Partido (Equipos y Goles) */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 w-5/12 font-header font-black uppercase text-xs truncate">
                                      <div className="w-6 h-6 bg-zinc-900 rounded-none flex items-center justify-center text-xs border border-zinc-800">
                                        {homeTeam.logoUrl}
                                      </div>
                                      <span className="truncate text-zinc-300">{homeTeam.name}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-center gap-1 w-2/12">
                                      {isExporting ? (
                                        <span className="w-7 h-7 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-data font-black text-white select-none">
                                          {match.homeScore !== undefined ? match.homeScore : '-'}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          pattern="[0-9]*"
                                          placeholder="-"
                                          value={match.homeScore ?? ''}
                                          onChange={(e) => handleScoreChange(group.id, match.id, 'home', e.target.value)}
                                          className="w-7 h-7 text-center font-data font-black text-xs bg-zinc-900 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white shadow-inner"
                                        />
                                      )}
                                      <span className="text-zinc-650 font-bold">:</span>
                                      {isExporting ? (
                                        <span className="w-7 h-7 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-data font-black text-white select-none">
                                          {match.awayScore !== undefined ? match.awayScore : '-'}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          pattern="[0-9]*"
                                          placeholder="-"
                                          value={match.awayScore ?? ''}
                                          onChange={(e) => handleScoreChange(group.id, match.id, 'away', e.target.value)}
                                          className="w-7 h-7 text-center font-data font-black text-xs bg-zinc-900 border border-zinc-800 rounded-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white shadow-inner"
                                        />
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2.5 w-5/12 font-header font-black uppercase text-xs truncate justify-end text-right">
                                      <span className="truncate text-zinc-300">{awayTeam.name}</span>
                                      <div className="w-6 h-6 bg-zinc-900 rounded-none flex items-center justify-center text-xs border border-zinc-800">
                                        {awayTeam.logoUrl}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PANEL DE CONFIGURACIÓN DE ELIMINATORIAS (DINÁMICO Y PREMIUM) */}
          <div className="mt-8 no-print w-full bg-zinc-900 border border-zinc-800 p-6 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Award className="w-4 h-4 text-yellow-400" />
              <h3 className="font-header font-black text-sm uppercase tracking-wider text-white">
                Configuración del Cuadro de Eliminatorias
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-850">
              <div className="flex flex-col gap-1.5">
                <label className="font-header font-bold text-[10px] uppercase text-zinc-450 tracking-wider">
                  ¿Cuántos clasifican directamente por grupo?
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={directQualifiers}
                  onChange={(e) => setDirectQualifiers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-header font-bold text-[10px] uppercase text-zinc-450 tracking-wider">
                  ¿Cuántos cupos extra hay (Mejores Terceros)?
                </label>
                <input
                  type="number"
                  min="0"
                  max="16"
                  value={wildcards}
                  onChange={(e) => setWildcards(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="h-9 px-3 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Lógica de cálculo en tiempo real y alertas de Byes */}
            {(() => {
              const totalQualifiers = (groups.length * directQualifiers) + wildcards;
              if (totalQualifiers === 0) return null;

              let nextPowerOfTwo = 2;
              while (nextPowerOfTwo < totalQualifiers) {
                nextPowerOfTwo *= 2;
              }
              const byesNeeded = nextPowerOfTwo - totalQualifiers;

              return (
                <div className="flex flex-col gap-4">
                  {byesNeeded > 0 ? (
                    <div className="bg-yellow-400/10 border border-yellow-400/25 p-4 text-xs text-yellow-400 uppercase font-header font-bold tracking-tight shadow-[0_0_15px_rgba(250,204,21,0.02)]">
                      ⚠️ AVISO DE CONFIGURACIÓN: Se clasificarán {totalQualifiers} equipos en total. 
                      Se creará un cuadro de {nextPowerOfTwo} (Octavos/Cuartos) con {byesNeeded} equipos exentos (Byes) que avanzarán directamente por mérito deportivo.
                    </div>
                  ) : (
                    <div className="bg-emerald-400/10 border border-emerald-400/25 p-4 text-xs text-emerald-400 uppercase font-header font-bold tracking-tight shadow-[0_0_15px_rgba(52,211,153,0.02)]">
                      ✅ CONFIGURACIÓN EXACTA: Se clasificarán {totalQualifiers} equipos en total. 
                      El cuadro de {nextPowerOfTwo} se completará de forma exacta sin exenciones.
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-3">
                    {!isTransitionEnabled && (
                      <p className="font-header font-bold text-xs text-yellow-400 bg-yellow-400/10 px-4 py-2.5 rounded-none border border-yellow-400/20 text-center w-full shadow-[0_0_15px_rgba(250,204,21,0.05)]">
                        ⚠️ INGRESA TODOS LOS MARCADORES O SIMULA LOS RESULTADOS DE GRUPO PARA GENERAR LA FASE ELIMINATORIA.
                      </p>
                    )}
                    <button
                      onClick={handleGenerateBracket}
                      disabled={!isTransitionEnabled}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-yellow-400 hover:bg-yellow-50 text-black font-header font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-yellow-400/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-yellow-350/10"
                    >
                      <Sparkles className="w-4 h-4 fill-current animate-spin-slow" />
                      CONSOLIDAR CRUCES Y GENERAR CUADRO
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* DOCUMENTO OCULTO: Acta de Sorteo Asimétrico */}
      <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none">
        <div 
          ref={actaRef}
          className="w-[210mm] min-h-[297mm] p-12 bg-white text-zinc-900 font-sans flex flex-col justify-between border border-zinc-200"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b-4 border-zinc-950 pb-5">
              <div>
                <h1 className="font-header font-black text-3xl tracking-tight text-zinc-950 uppercase leading-none">
                  ACTA OFICIAL DE SORTEO ALEATORIO
                </h1>
                <p className="font-header text-xs uppercase text-zinc-500 tracking-widest mt-2">
                  DISTRIBUCIÓN DE COMPETICIÓN ASIMÉTRICA
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1.5 bg-zinc-950 text-white font-header font-black text-[10px] tracking-wider uppercase">
                  DOCUMENTO CERTIFICADO
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 p-5 leading-relaxed text-xs">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="font-bold text-[10px] uppercase text-zinc-450 block">Torneo de Competición</span>
                  <span className="font-header font-black uppercase text-zinc-900 text-sm">KINGS CUP F7</span>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-zinc-450 block">Marca de Tiempo Inmutable</span>
                  <span className="font-mono text-zinc-900 font-bold text-xs">{drawTimestamp || new Date().toLocaleString()}</span>
                </div>
              </div>
              
              <div className="border-t border-zinc-200 pt-3">
                <p className="text-zinc-650 text-justify text-[11px]">
                  Este documento certifica que los grupos detallados a continuación han sido generados mediante un algoritmo de asignación aleatoria, sin intervención manual, garantizando la imparcialidad del torneo.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6 mt-4">
              <h2 className="font-header font-black text-sm uppercase text-zinc-950 border-b border-zinc-300 pb-1.5 tracking-wider">
                DISTRIBUCIÓN OFICIAL DE EQUIPOS ({registeredTeams.length} TOTAL)
              </h2>
              
              <div className="grid grid-cols-2 gap-6">
                {groupNames.map((name, gIdx) => {
                  const groupTeams = registeredTeams.filter(t => teamAssignments[t.id] === gIdx);
                  return (
                    <div key={gIdx} className="border border-zinc-200 p-4 bg-zinc-50/30">
                      <h3 className="font-header font-black text-xs uppercase text-zinc-900 border-b border-zinc-200 pb-1.5 mb-2.5">
                        {name} ({groupTeams.length} Equipos)
                      </h3>
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-zinc-450 border-b border-zinc-200 text-[9px] uppercase font-bold">
                            <th className="py-1 w-8 text-center">Nº</th>
                            <th className="py-1">Nombre del Equipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupTeams.map((t, idx) => (
                            <tr key={t.id} className="border-b border-zinc-100">
                              <td className="py-1.5 text-center font-mono font-bold text-zinc-450">{idx + 1}</td>
                              <td className="py-1.5 font-header font-bold uppercase text-zinc-800 flex items-center gap-1.5">
                                <span>{t.logoUrl}</span>
                                <span>{t.name}</span>
                              </td>
                            </tr>
                          ))}
                          {groupTeams.length === 0 && (
                            <tr>
                              <td colSpan={2} className="py-3 text-center text-zinc-400 italic">Sin equipos asignados</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="border-t border-zinc-300 pt-8">
            <div className="grid grid-cols-3 gap-6 text-[10px] text-zinc-500 font-sans">
              <div className="flex flex-col text-center">
                <div className="h-10 border-b border-zinc-350"></div>
                <span className="font-header font-black uppercase text-[9px] tracking-wider text-zinc-500 mt-2">
                  Firma de la Organización
                </span>
              </div>
              <div className="flex flex-col text-center">
                <div className="h-10 border-b border-zinc-350"></div>
                <span className="font-header font-black uppercase text-[9px] tracking-wider text-zinc-500 mt-2">
                  Certificador Imparcial
                </span>
              </div>
              <div className="flex flex-col text-center">
                <div className="h-10 border-b border-zinc-350"></div>
                <span className="font-header font-black uppercase text-[9px] tracking-wider text-zinc-500 mt-2">
                  Fecha y Firma del Delegado
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import ThemeSelector from '@/components/ThemeSelector';
import RegistrationForm from '@/components/RegistrationForm';
import GroupStage from '@/components/GroupStage';
import BracketTree from '@/components/BracketTree';
import TeamsRegister from '@/components/TeamsRegister';
import StatsPanel from '@/components/StatsPanel';
import { MOCK_TEAMS, getInitialGroups, getInitialKnockoutMatches, calculateStandings } from '@/utils/competition';
import { Group, Match, Team, MatchStats, SavedTournament } from '@/types';
import { ClipboardList, Users, GitMerge, Settings, Play, ShieldAlert, Award, BarChart3, Save, LogOut, Trash2, FolderOpen, PlusCircle, Calendar, ArrowLeft, Loader2 } from 'lucide-react';

const PRESETS = [
  {
    name: "Cyber Arena - Cian y Violeta",
    logoUrl: "⚡",
    theme: {
      primaryColor: "#00f0ff",
      secondaryColor: "#d946ef",
      backgroundColor: "#040206",
      textColor: "#f1f5f9",
      cardBackgroundColor: "#100b1a",
      fontFamilyHeader: "var(--font-oswald)",
      fontFamilyData: "var(--font-roboto-mono)",
    }
  },
  {
    name: "Kings Cup - Césped Neón",
    logoUrl: "👑",
    theme: {
      primaryColor: "#ccff00",
      secondaryColor: "#ff0055",
      backgroundColor: "#050508",
      textColor: "#ffffff",
      cardBackgroundColor: "#0d0e15",
      fontFamilyHeader: "var(--font-oswald)",
      fontFamilyData: "var(--font-roboto-mono)",
    }
  },
  {
    name: "DAZN Style - Oro y Carbono",
    logoUrl: "⚽",
    theme: {
      primaryColor: "#facc15",
      secondaryColor: "#38bdf8",
      backgroundColor: "#09090b",
      textColor: "#f4f4f5",
      cardBackgroundColor: "#18181b",
      fontFamilyHeader: "var(--font-oswald)",
      fontFamilyData: "var(--font-roboto-mono)",
    }
  },
  {
    name: "Winamax - Rojo Asfalto",
    logoUrl: "🃏",
    theme: {
      primaryColor: "#ef4444",
      secondaryColor: "#10b981",
      backgroundColor: "#090505",
      textColor: "#f3f4f6",
      cardBackgroundColor: "#180d0d",
      fontFamilyHeader: "var(--font-oswald)",
      fontFamilyData: "var(--font-roboto-mono)",
    }
  }
];

export default function Home() {
  const { config, setTournamentConfig } = useTheme();
  const [isTournamentActive, setIsTournamentActive] = useState<boolean>(false);

  // Estados del formulario para la creación del torneo
  const [newTName, setNewTName] = useState("CYBER ARENA F7");
  const [newTSport, setNewTSport] = useState("FÚTBOL 7");
  const [newTLogo, setNewTLogo] = useState("⚡");
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [initMode, setInitMode] = useState<'empty' | 'demo'>('empty');
  
  // Pestañas disponibles: 'teamsRegister' | 'registration' | 'groupStage' | 'bracket' | 'stats'
  const [activeTab, setActiveTab] = useState<'teamsRegister' | 'registration' | 'groupStage' | 'bracket' | 'stats'>('teamsRegister');
  
  // Base de datos local/Supabase de equipos registrados
  const [registeredTeams, setRegisteredTeams] = useState<Team[]>([]);
  
  // Inicialización de Grupos
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Inicialización de eliminatorias
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Inicialización de estadísticas de partido
  const [matchStats, setMatchStats] = useState<Record<string, MatchStats>>({});

  // Nuevos estados para soportar múltiples torneos
  const [savedTournaments, setSavedTournaments] = useState<SavedTournament[]>([]);
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Helper para dar formato legible a la fecha
  const formatLastModified = (isoString: string): string => {
    if (!isoString) return 'Desconocida';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return 'Desconocida';
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return 'Desconocida';
    }
  };

  // Cargar de MongoDB y localStorage al montar el componente
  useEffect(() => {
    async function loadTournaments() {
      setIsLoading(true);
      setDbError(null);
      let loadedTournaments: SavedTournament[] = [];

      try {
        const response = await fetch('/api/tournaments');
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Error al conectar con la base de datos');
        }
        loadedTournaments = await response.json();
        setSavedTournaments(loadedTournaments);
      } catch (err: any) {
        console.error("Error al cargar torneos de MongoDB:", err);
        setDbError(err.message || 'No se pudieron cargar los torneos de la base de datos.');

        // Fallback a localStorage si MongoDB falla
        if (typeof window !== 'undefined') {
          const rawSavedTournaments = localStorage.getItem('saved_tournaments');
          if (rawSavedTournaments) {
            try {
              loadedTournaments = JSON.parse(rawSavedTournaments);
              setSavedTournaments(loadedTournaments);
            } catch (e) {
              console.error("Error parsing saved_tournaments fallback:", e);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }

      // 2. Cargar el id del torneo actual y verificar si está activo (manteniendo la sesión local del navegador)
      if (typeof window !== 'undefined') {
        const savedCurrentId = localStorage.getItem('current_tournament_id');
        const savedActive = localStorage.getItem('tournament_active');

        if (savedActive === 'true' && savedCurrentId) {
          // Intentar encontrar el torneo en la lista cargada (nube o fallback local)
          const currentTournament = loadedTournaments.find(t => t.id === savedCurrentId);
          if (currentTournament) {
            setCurrentTournamentId(savedCurrentId);
            setRegisteredTeams(currentTournament.registeredTeams || []);
            setGroups(currentTournament.groups || []);
            setKnockoutMatches(currentTournament.knockoutMatches || []);
            setMatchStats(currentTournament.matchStats || {});
            setActiveTab(currentTournament.activeTab || 'teamsRegister');
            setIsTournamentActive(true);
            setTournamentConfig(currentTournament.config);
          } else {
            // Fallback legacy a las variables individuales de localStorage
            const savedTeams = localStorage.getItem('tournament_teams');
            const savedGroups = localStorage.getItem('tournament_groups');
            const savedKnockout = localStorage.getItem('tournament_knockout');
            const savedStats = localStorage.getItem('tournament_stats');

            if (savedTeams) {
              try { setRegisteredTeams(JSON.parse(savedTeams)); } catch (e) { console.error(e); }
            }
            if (savedGroups) {
              try { setGroups(JSON.parse(savedGroups)); } catch (e) { console.error(e); }
            }
            if (savedKnockout) {
              try { setKnockoutMatches(JSON.parse(savedKnockout)); } catch (e) { console.error(e); }
            }
            if (savedStats) {
              try { setMatchStats(JSON.parse(savedStats)); } catch (e) { console.error(e); }
            }
            setIsTournamentActive(true);
          }
        }
      }
    }

    loadTournaments();
  }, []);

  // Guardar en localStorage ante cambios en los estados principales
  useEffect(() => {
    localStorage.setItem('tournament_teams', JSON.stringify(registeredTeams));
  }, [registeredTeams]);

  useEffect(() => {
    localStorage.setItem('tournament_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('tournament_knockout', JSON.stringify(knockoutMatches));
  }, [knockoutMatches]);

  useEffect(() => {
    localStorage.setItem('tournament_stats', JSON.stringify(matchStats));
  }, [matchStats]);

  // Auto-guardado en segundo plano en la lista de torneos (sin alterar lastModified)
  useEffect(() => {
    if (typeof window !== 'undefined' && isTournamentActive && currentTournamentId && savedTournaments.length > 0) {
      const updated = savedTournaments.map(t => {
        if (t.id === currentTournamentId) {
          return {
            ...t,
            config, // de ThemeContext
            registeredTeams,
            groups,
            knockoutMatches,
            matchStats,
            activeTab
          };
        }
        return t;
      });
      
      const currentString = JSON.stringify(savedTournaments);
      const nextString = JSON.stringify(updated);
      if (currentString !== nextString) {
        setSavedTournaments(updated);
        localStorage.setItem('saved_tournaments', nextString);
      }
    }
  }, [registeredTeams, groups, knockoutMatches, matchStats, activeTab, config, currentTournamentId, isTournamentActive, savedTournaments]);

  // Manejar el guardado explícito en local y en MongoDB
  const handleSaveTournament = async (updatedStats?: Record<string, MatchStats> | React.MouseEvent) => {
    if (!currentTournamentId) return;

    // Verificar si el argumento es un evento de ratón para ignorarlo
    const statsToSave = (updatedStats && !('nativeEvent' in updatedStats))
      ? (updatedStats as Record<string, MatchStats>)
      : matchStats;

    const targetTournament = {
      id: currentTournamentId,
      name: config.tournamentName,
      sport: config.sport,
      logoUrl: config.logoUrl,
      lastModified: new Date().toISOString(),
      config: config,
      registeredTeams,
      groups,
      knockoutMatches,
      matchStats: statsToSave,
      activeTab
    };

    const updated = savedTournaments.map(t => {
      if (t.id === currentTournamentId) {
        return targetTournament;
      }
      return t;
    });

    // Actualización local rápida
    setSavedTournaments(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saved_tournaments', JSON.stringify(updated));
    }

    // Guardado en la base de datos de MongoDB
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetTournament),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo guardar en MongoDB');
      }

      setSaveToast({ show: true, message: "¡Torneo guardado correctamente en la nube!" });
    } catch (err: any) {
      console.error("Error al guardar torneo en MongoDB:", err);
      setSaveToast({ 
        show: true, 
        message: `¡Guardado en local! (Error en la nube: ${err.message || 'Sin conexión'})` 
      });
    }

    setTimeout(() => setSaveToast({ show: false, message: "" }), 4000);
  };

  // Manejar la salida del torneo
  const handleExitTournament = () => {
    setShowExitModal(true);
  };

  const confirmExitAndSave = () => {
    handleSaveTournament();
    setShowExitModal(false);
    setIsTournamentActive(false);
    setCurrentTournamentId(null);
    localStorage.setItem('tournament_active', 'false');
    localStorage.removeItem('current_tournament_id');
    setView('list');
  };

  const confirmExitWithoutSaving = () => {
    setShowExitModal(false);
    setIsTournamentActive(false);
    setCurrentTournamentId(null);
    localStorage.setItem('tournament_active', 'false');
    localStorage.removeItem('current_tournament_id');
    setView('list');
  };

  // Manejar la eliminación del torneo en local y en MongoDB
  const handleDeleteTournament = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el torneo "${name}" permanentemente? Se perderán todos sus datos.`)) {
      // Filtrar localmente
      const updated = savedTournaments.filter(t => t.id !== id);
      setSavedTournaments(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('saved_tournaments', JSON.stringify(updated));
      }

      if (currentTournamentId === id) {
        setIsTournamentActive(false);
        setCurrentTournamentId(null);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tournament_active', 'false');
          localStorage.removeItem('current_tournament_id');
        }
        setView('list');
      }

      // Eliminar de MongoDB
      try {
        const response = await fetch(`/api/tournaments?id=${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'No se pudo eliminar de MongoDB');
        }
      } catch (err: any) {
        console.error("Error al eliminar torneo de MongoDB:", err);
        alert(`Se eliminó localmente pero falló en la nube: ${err.message || 'Sin conexión'}`);
      }
    }
  };

  // Manejar la carga de un torneo desde la lista
  const handleLoadTournament = (id: string) => {
    const tournament = savedTournaments.find(t => t.id === id);
    if (!tournament) return;

    setCurrentTournamentId(id);
    setRegisteredTeams(tournament.registeredTeams || []);
    setGroups(tournament.groups || []);
    setKnockoutMatches(tournament.knockoutMatches || []);
    setMatchStats(tournament.matchStats || {});
    setActiveTab(tournament.activeTab || 'teamsRegister');
    setTournamentConfig(tournament.config);
    setIsTournamentActive(true);
    localStorage.setItem('current_tournament_id', id);
    localStorage.setItem('tournament_active', 'true');
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();

    const preset = PRESETS[selectedPresetIdx];
    const finalConfig = {
      tournamentName: newTName.toUpperCase(),
      sport: newTSport.toUpperCase(),
      logoUrl: newTLogo,
      theme: preset.theme,
    };

    setTournamentConfig(finalConfig);

    let initialTeams: Team[] = [];
    let initialGroups: Group[] = [];
    let initialKnockout: Match[] = [];

    if (initMode === 'demo') {
      initialTeams = MOCK_TEAMS;
      initialGroups = getInitialGroups('fase-grupos');
      initialKnockout = getInitialKnockoutMatches('fase-eliminatorias');
    }

    const newId = Date.now().toString();
    const newTournament: SavedTournament = {
      id: newId,
      name: newTName.toUpperCase(),
      sport: newTSport.toUpperCase(),
      logoUrl: newTLogo,
      lastModified: new Date().toISOString(),
      config: finalConfig,
      registeredTeams: initialTeams,
      groups: initialGroups,
      knockoutMatches: initialKnockout,
      matchStats: {},
      activeTab: 'teamsRegister',
    };

    const updatedTournaments = [...savedTournaments, newTournament];
    setSavedTournaments(updatedTournaments);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saved_tournaments', JSON.stringify(updatedTournaments));
    }

    setRegisteredTeams(initialTeams);
    setGroups(initialGroups);
    setKnockoutMatches(initialKnockout);
    setMatchStats({});
    setCurrentTournamentId(newId);
    setIsTournamentActive(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_tournament_id', newId);
      localStorage.setItem('tournament_active', 'true');
    }
    setActiveTab('teamsRegister');

    // Guardar el nuevo torneo en MongoDB
    try {
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTournament),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo registrar en MongoDB');
      }
    } catch (err: any) {
      console.error("Error al registrar nuevo torneo en MongoDB:", err);
      setSaveToast({ 
        show: true, 
        message: `¡Creado localmente! (Error al subir: ${err.message || 'Sin conexión'})` 
      });
      setTimeout(() => setSaveToast({ show: false, message: "" }), 4000);
    }

    // Resetear campos del formulario
    setNewTName("CYBER ARENA F7");
    setNewTSport("FÚTBOL 7");
    setNewTLogo("⚡");
    setSelectedPresetIdx(0);
    setInitMode('empty');
  };

  // Comprobar si todos los partidos de grupos han finalizado
  const isTransitionEnabled = groups.length > 0 && groups.every(g => g.matches.every(m => m.status === 'played'));

  // Manejar el avance automático a la fase de eliminatorias con cruces dinámicos
  const handleTransitionToKnockout = (generatedMatches: Match[]) => {
    setKnockoutMatches(generatedMatches);
    setActiveTab('bracket');
  };

  // Simular marcadores aleatorios para la fase de liguilla (Fácil prueba)
  const handleSimulateGroupStage = () => {
    const updatedGroups = groups.map(g => {
      const simulatedMatches = g.matches.map(m => {
        const homeScore = Math.floor(Math.random() * 5);
        const awayScore = Math.floor(Math.random() * 5);
        return {
          ...m,
          homeScore,
          awayScore,
          status: 'played' as const
        };
      });

      return {
        ...g,
        matches: simulatedMatches,
        standings: calculateStandings(g.teams, simulatedMatches)
      };
    });

    setGroups(updatedGroups);
  };

  // Determinar el estado del torneo y el paso actual recomendado
  const getTournamentStep = () => {
    // Paso 1: Registrar al menos 4 equipos
    if (registeredTeams.length < 4) {
      return {
        step: 1,
        title: "Registrar Equipos",
        description: `Tienes ${registeredTeams.length} de 4 equipos mínimos registrados. Añade más clubes y sus jugadores para comenzar.`,
        actionLabel: "Ir a Registro de Clubes",
        targetTab: "teamsRegister" as const
      };
    }

    // Paso 2: Realizar el Sorteo y Generar Calendario de Grupos
    const hasGroups = groups.length > 0;
    const hasGroupMatches = hasGroups && groups.some(g => g.matches.length > 0);
    if (!hasGroupMatches) {
      return {
        step: 2,
        title: "Sorteo y Calendario de Grupos",
        description: "Los equipos están registrados. Ahora configura el número de grupos, campos y horarios, y ejecuta el Sorteo.",
        actionLabel: "Ir a Sorteo de Grupos",
        targetTab: "groupStage" as const
      };
    }

    // Paso 3: Jugar Fase de Grupos
    const groupMatches = groups.flatMap(g => g.matches);
    const playedGroupMatches = groupMatches.filter(m => m.status === 'played');
    const groupStageDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'played');
    
    if (!groupStageDone) {
      return {
        step: 3,
        title: "Jugar Fase de Grupos",
        description: `Fase de grupos en curso. Se han jugado ${playedGroupMatches.length} de ${groupMatches.length} partidos. Registra los resultados de los partidos pendientes.`,
        actionLabel: "Ver Calendario de Grupos",
        targetTab: "groupStage" as const
      };
    }

    // Paso 4: Generar Cruces Eliminatorios
    const hasKnockoutTeams = knockoutMatches.some(m => m.homeTeamId !== null && m.homeTeamId !== 'BYE');
    if (groupStageDone && !hasKnockoutTeams) {
      return {
        step: 4,
        title: "Generar Cruces Eliminatorios",
        description: "¡La Fase de Grupos ha terminado! Ve al final de la pestaña 'Fase de Grupos' y pulsa el botón amarillo 'Consolidar Cruces y Generar Cuadro'.",
        actionLabel: "Ir a Fase de Grupos",
        targetTab: "groupStage" as const
      };
    }

    // Paso 5: Jugar Fase Final
    const finalMatch = knockoutMatches.find(m => m.roundName === 'Final');
    const hasChampion = finalMatch && finalMatch.status === 'played';
    if (!hasChampion) {
      return {
        step: 5,
        title: "Jugar Fase Final",
        description: "Las eliminatorias están listas. Introduce los marcadores de los cruces para que los ganadores avancen automáticamente hasta la Gran Final.",
        actionLabel: "Ver Árbol de Cruces",
        targetTab: "bracket" as const
      };
    }

    // Paso 6: Torneo Finalizado
    return {
      step: 6,
      title: "Torneo Finalizado",
      description: "¡Enhorabuena! El torneo ha finalizado correctamente. Revisa el campeón en la sección de Cruces y los premios individuales en Estadísticas.",
      actionLabel: "Ver Premios y Estadísticas",
      targetTab: "stats" as const
    };
  };

  const currentStepInfo = getTournamentStep();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-950 text-white font-sans pb-20">
      
      {/* Header Premium (Estilo Canal Deportivo - DAZN/Winamax) */}
      <header className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-850 px-6 py-4 no-print shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-none flex items-center justify-center text-2xl">
              {isTournamentActive ? config.logoUrl : "🏆"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-header font-black uppercase tracking-wider px-1.5 py-0.5 rounded-none bg-yellow-400 text-black">
                  {isTournamentActive ? config.sport : "CREAR NUEVO"}
                </span>
                <span className="text-[10px] font-header font-bold uppercase tracking-wider text-zinc-550">
                  Panel de Competición
                </span>
              </div>
              <h1 className="font-header font-black text-2xl text-white uppercase tracking-tight leading-none mt-1">
                {isTournamentActive ? config.tournamentName : "GESTOR DE TORNEOS"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isTournamentActive && activeTab === 'groupStage' && groups.length > 0 && !isTransitionEnabled && (
              <button
                onClick={handleSimulateGroupStage}
                className="flex items-center gap-2 text-xs px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 font-header font-black uppercase tracking-tight rounded-none transition-all cursor-pointer border border-yellow-300/10"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                SIMULAR RESULTADOS
              </button>
            )}

            {isTournamentActive && (
              <>
                <button
                  onClick={() => handleSaveTournament()}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-header font-black uppercase tracking-tight rounded-none transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  GUARDAR
                </button>

                <button
                  onClick={handleExitTournament}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white font-header font-black uppercase tracking-tight rounded-none transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  SALIR
                </button>

                <button
                  onClick={() => handleDeleteTournament(currentTournamentId!, config.tournamentName)}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 border border-red-500/30 hover:border-red-500 bg-red-950/20 text-red-400 hover:text-red-300 font-header font-black uppercase tracking-tight rounded-none transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ELIMINAR
                </button>
              </>
            )}

            {isTournamentActive && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 text-xs px-4 py-2 border rounded-none transition-all font-header font-black uppercase tracking-tight cursor-pointer ${
                  showSettings 
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400' 
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-300'
                }`}
              >
                <Settings className={`w-3.5 h-3.5 ${showSettings ? 'rotate-90' : ''} transition-transform duration-300`} />
                CONFIGURAR SKIN
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Panel de Ajustes Temáticos */}
      {showSettings && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-6 no-print">
          <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-none shadow-2xl">
            <ThemeSelector />
          </div>
        </div>
      )}

      {isTournamentActive ? (
        <>
          {/* Pestañas de Navegación Minimalistas con Borde Inferior Amarillo DAZN */}
          <nav className="max-w-7xl mx-auto w-full px-6 py-4 no-print">
            <div className="flex border-b border-zinc-800 justify-start gap-8 flex-wrap">
              <button
                onClick={() => setActiveTab('teamsRegister')}
                className={`flex items-center gap-2.5 py-4 px-2 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'teamsRegister'
                    ? 'border-b-4 border-yellow-400 text-yellow-400'
                    : 'border-b-4 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Award className="w-4 h-4" />
                Registro de Clubes
              </button>
              <button
                onClick={() => setActiveTab('registration')}
                className={`flex items-center gap-2.5 py-4 px-2 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'registration'
                    ? 'border-b-4 border-yellow-400 text-yellow-400'
                    : 'border-b-4 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Hoja de Inscripción (Folio)
              </button>
              <button
                onClick={() => setActiveTab('groupStage')}
                className={`flex items-center gap-2.5 py-4 px-2 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'groupStage'
                    ? 'border-b-4 border-yellow-400 text-yellow-400'
                    : 'border-b-4 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Fase de Grupos (Sorteo)
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`flex items-center gap-2.5 py-4 px-2 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'bracket'
                    ? 'border-b-4 border-yellow-400 text-yellow-400'
                    : 'border-b-4 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <GitMerge className="w-4 h-4" />
                Árbol de Cruces (Bracket)
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-2.5 py-4 px-2 text-xs font-header font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'stats'
                    ? 'border-b-4 border-yellow-400 text-yellow-400'
                    : 'border-b-4 border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Estadísticas (Goleadores/Porteros)
              </button>
            </div>
          </nav>

          {/* Asistente del Torneo (Paso a Paso) */}
          <div className="max-w-7xl mx-auto w-full px-6 mb-6 no-print">
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-none shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                  <span className="text-[10px] font-header font-black uppercase tracking-wider text-yellow-400">
                    Paso {currentStepInfo.step}: {currentStepInfo.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-350 leading-relaxed font-sans max-w-2xl">
                  {currentStepInfo.description}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab(currentStepInfo.targetTab)}
                  className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black text-xs uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  {currentStepInfo.actionLabel} &rarr;
                </button>
              </div>
            </div>

            {/* Barra de progreso de pasos visuales */}
            <div className="grid grid-cols-5 gap-2 mt-3 text-center">
              {[
                { step: 1, label: "1. Registro", done: registeredTeams.length >= 4 },
                { step: 2, label: "2. Sorteo", done: groups.length > 0 },
                { step: 3, label: "3. Fase de Grupos", done: groups.length > 0 && groups.every(g => g.matches.every(m => m.status === 'played')) },
                { step: 4, label: "4. Cruces", done: knockoutMatches.some(m => m.homeTeamId !== null && m.homeTeamId !== 'BYE') },
                { step: 5, label: "5. Gran Final", done: knockoutMatches.find(m => m.roundName === 'Final')?.status === 'played' }
              ].map((s) => {
                const isActive = currentStepInfo.step === s.step;
                return (
                  <div 
                    key={s.step} 
                    className={`py-2 px-1 border text-[10px] font-header font-black uppercase tracking-tight transition-all duration-300 ${
                      isActive 
                        ? 'border-yellow-400 bg-yellow-400/5 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.05)]' 
                        : s.done 
                          ? 'border-zinc-800 bg-zinc-900/40 text-emerald-400' 
                          : 'border-zinc-900 bg-zinc-950/20 text-zinc-650'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      {s.done && <span className="text-[9px]">✓</span>}
                      <span>{s.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contenido Principal */}
          <main className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center">
              {activeTab === 'teamsRegister' && (
                <TeamsRegister 
                  registeredTeams={registeredTeams} 
                  setRegisteredTeams={setRegisteredTeams} 
                />
              )}
              {activeTab === 'registration' && <RegistrationForm />}
              {activeTab === 'groupStage' && (
                <GroupStage 
                  groups={groups} 
                  setGroups={setGroups} 
                  onTransitionToKnockout={handleTransitionToKnockout}
                  isTransitionEnabled={isTransitionEnabled}
                  registeredTeams={registeredTeams}
                />
              )}
              {activeTab === 'bracket' && (
                <BracketTree 
                  matches={knockoutMatches} 
                  setMatches={setKnockoutMatches} 
                  teams={registeredTeams} 
                />
              )}
              {activeTab === 'stats' && (
                <StatsPanel
                  registeredTeams={registeredTeams}
                  groups={groups}
                  knockoutMatches={knockoutMatches}
                  matchStats={matchStats}
                  setMatchStats={setMatchStats}
                  onSaveTournament={handleSaveTournament}
                />
              )}
            </div>
          </main>
        </>
      ) : (
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-10">
          {view === 'list' ? (
            <div className="flex-1 flex flex-col gap-8">
              {/* Encabezado del Tablero */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-850 pb-6">
                <div>
                  <h2 className="font-header font-black text-3xl text-white uppercase tracking-tight">
                    Tus Torneos Guardados
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xl">
                    Administra tus competiciones locales, edita y exporta con un estilo premium deportivo. Todos los datos están aislados por torneo.
                  </p>
                </div>
                <button
                  onClick={() => setView('create')}
                  className="flex items-center gap-2 px-5 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-lg shadow-yellow-400/10"
                >
                  <PlusCircle className="w-4 h-4" />
                  Crear Nuevo Torneo
                </button>
              </div>

              {dbError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-semibold text-rose-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>
                    Modo Local Temporal Activo: {dbError}. Los cambios se guardarán en tu navegador, pero no se compartirán en la nube hasta solucionar la conexión.
                  </span>
                </div>
              )}

              {/* Lista en Rejilla */}
              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center border border-zinc-850 bg-zinc-900/10">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mb-3" />
                  <p className="font-header font-black text-xs uppercase tracking-widest text-zinc-400">
                    Cargando Torneos desde la Nube...
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Botón "+ Nuevo Torneo" en tarjeta */}
                    <div
                      onClick={() => setView('create')}
                      className="bg-zinc-950/40 border-2 border-dashed border-zinc-850 hover:border-yellow-400/50 hover:bg-zinc-900/20 p-8 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 cursor-pointer text-center group"
                    >
                      <div className="w-12 h-12 rounded-full border border-zinc-850 flex items-center justify-center text-zinc-500 group-hover:text-yellow-400 group-hover:border-yellow-400/30 transition-all text-xl mb-3">
                        +
                      </div>
                      <span className="font-header font-black text-sm uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                        Crear Nuevo Torneo
                      </span>
                      <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-normal font-sans">
                        Configura un nuevo torneo desde cero o carga datos de demostración para probar.
                      </p>
                    </div>

                    {/* Torneos Guardados */}
                    {savedTournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="bg-zinc-900 border border-zinc-850 hover:border-yellow-400/40 p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 relative group shadow-xl"
                      >
                        {/* Botón Eliminar en la esquina superior derecha */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTournament(tournament.id, tournament.name);
                          }}
                          className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 p-1.5 transition-colors cursor-pointer"
                          title="Eliminar Torneo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Contenido Superior */}
                        <div className="flex gap-4 items-start w-11/12">
                          <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform shrink-0">
                            {tournament.logoUrl}
                          </div>
                          <div className="truncate">
                            <span className="inline-block text-[9px] font-header font-black tracking-wider text-yellow-400 uppercase">
                              {tournament.sport}
                            </span>
                            <h3 className="font-header font-black text-lg text-white uppercase tracking-tight mt-0.5 truncate group-hover:text-yellow-400 transition-colors">
                              {tournament.name}
                            </h3>
                          </div>
                        </div>

                        {/* Metadata y Botón de Entrada */}
                        <div className="mt-6 flex flex-col justify-between">
                          <div className="flex flex-col gap-1 text-[10px] text-zinc-500 font-sans border-t border-zinc-850/50 pt-3 mb-4">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-zinc-650" />
                              <span>{tournament.registeredTeams?.length || 0} Equipos Registrados</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-650" />
                              <span>Modificado: {formatLastModified(tournament.lastModified)}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleLoadTournament(tournament.id)}
                            className="w-full py-2.5 bg-yellow-400 text-black hover:bg-yellow-500 font-header font-black uppercase text-xs tracking-wider transition-all cursor-pointer text-center"
                          >
                            Entrar al Panel &rarr;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {savedTournaments.length === 0 && (
                    <div className="py-16 text-center border border-dashed border-zinc-850 bg-zinc-900/10 max-w-lg mx-auto w-full mt-6">
                      <FolderOpen className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                      <p className="font-header font-black text-sm uppercase tracking-wider text-zinc-400">
                        No tienes torneos guardados
                      </p>
                      <p className="text-[10px] text-zinc-500 font-sans mt-1 max-w-xs mx-auto">
                        ¡Comienza ahora! Haz clic en el botón de arriba para crear y configurar tu primera competición.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Formulario de Creación */
            <div className="flex-1 flex flex-col items-center justify-center py-6 w-full">
              <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60"></div>
                
                {/* Botón Volver */}
                <button
                  onClick={() => setView('list')}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-header font-black uppercase tracking-wider mb-6 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver a mis torneos
                </button>

                <div className="text-center border-b border-zinc-850 pb-6 mb-8">
                  <span className="text-[10px] font-header font-black tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-4 py-1.5 uppercase">
                    ASISTENTE DE CREACIÓN DE TORNEOS
                  </span>
                  <h1 className="font-header font-black text-3xl text-white uppercase tracking-tight mt-3">
                    Crear Nuevo Torneo
                  </h1>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
                    Define las bases, el deporte y el estilo visual de tu torneo. Los datos se aislarán localmente para evitar mezclar competiciones anteriores.
                  </p>
                </div>

                <form onSubmit={handleCreateTournament} className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Nombre del Torneo */}
                    <div className="flex flex-col gap-2">
                      <label className="font-header font-bold text-[10px] uppercase text-zinc-400 tracking-wider">
                        Nombre del Torneo
                      </label>
                      <input
                        type="text"
                        required
                        value={newTName}
                        onChange={(e) => setNewTName(e.target.value)}
                        placeholder="E.g. CYBER ARENA F7"
                        className="h-10 px-3 bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white text-xs font-sans uppercase font-bold"
                      />
                    </div>

                    {/* Deporte */}
                    <div className="flex flex-col gap-2">
                      <label className="font-header font-bold text-[10px] uppercase text-zinc-400 tracking-wider">
                        Deporte / Categoría
                      </label>
                      <input
                        type="text"
                        required
                        value={newTSport}
                        onChange={(e) => setNewTSport(e.target.value)}
                        placeholder="E.g. FÚTBOL 7, FÚTBOL SALA, BALONCESTO"
                        className="h-10 px-3 bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none text-white text-xs font-sans uppercase font-bold"
                      />
                    </div>

                  </div>

                  {/* Selección de Logotipo / Emoticono */}
                  <div className="flex flex-col gap-2.5">
                    <label className="font-header font-bold text-[10px] uppercase text-zinc-400 tracking-wider">
                      Logotipo / Icono del Torneo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["🏆", "⚽", "⚡", "👑", "🃏", "🦖", "🦁", "🏀", "🏐", "🎾"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewTLogo(emoji)}
                          className={`w-10 h-10 flex items-center justify-center text-xl bg-zinc-950 border transition-all cursor-pointer ${
                            newTLogo === emoji 
                              ? 'border-yellow-400 bg-yellow-400/5 text-white' 
                              : 'border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <input
                        type="text"
                        maxLength={2}
                        value={newTLogo}
                        onChange={(e) => setNewTLogo(e.target.value)}
                        placeholder="Otro"
                        className="w-16 h-10 px-2 text-center bg-zinc-950 border border-zinc-800 focus:border-yellow-400 focus:outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Selección de Plantillas de Diseño (Skins) */}
                  <div className="flex flex-col gap-2.5">
                    <label className="font-header font-bold text-[10px] uppercase text-zinc-400 tracking-wider">
                      Estilo de Diseño (Skin Visual)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {PRESETS.map((preset, idx) => {
                        const isSelected = selectedPresetIdx === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedPresetIdx(idx)}
                            className={`p-4 bg-zinc-950 border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-yellow-400 bg-yellow-400/5' 
                                : 'border-zinc-850 hover:border-zinc-800'
                            }`}
                          >
                            <span className="font-header font-black text-xs uppercase text-white truncate">
                              {preset.name.split(" - ")[0]}
                            </span>
                            <div className="flex gap-1.5 mt-1">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.theme.primaryColor }}></span>
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.theme.secondaryColor }}></span>
                              <span className="w-4 h-4 rounded-full border border-zinc-800" style={{ backgroundColor: preset.theme.backgroundColor }}></span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modo de Inicialización */}
                  <div className="flex flex-col gap-2.5 border-t border-zinc-850 pt-5 mt-2">
                    <label className="font-header font-bold text-[10px] uppercase text-zinc-400 tracking-wider">
                      Configuración Inicial de Equipos
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <button
                        type="button"
                        onClick={() => setInitMode('empty')}
                        className={`p-4 bg-zinc-950 border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          initMode === 'empty'
                            ? 'border-yellow-400 bg-yellow-400/5'
                            : 'border-zinc-850 hover:border-zinc-800'
                        }`}
                      >
                        <span className="font-header font-black text-xs uppercase text-white">
                          🌱 Iniciar Torneo Vacío
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans leading-normal mt-0.5">
                          Empieza desde cero. Ideal para competiciones reales donde registrarás tus propios equipos.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInitMode('demo')}
                        className={`p-4 bg-zinc-950 border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          initMode === 'demo'
                            ? 'border-yellow-400 bg-yellow-400/5'
                            : 'border-zinc-850 hover:border-zinc-800'
                        }`}
                      >
                        <span className="font-header font-black text-xs uppercase text-white">
                          ⚡ Cargar Equipos Demo
                        </span>
                        <span className="text-[10px] text-zinc-500 font-sans leading-normal mt-0.5">
                          Carga 8 equipos de demostración con jugadores listos. Ideal para probar las funciones de la app.
                        </span>
                      </button>

                    </div>
                  </div>

                  {/* Botón de Creación */}
                  <button
                    type="submit"
                    className="w-full py-4 mt-4 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-yellow-400/10 cursor-pointer text-center"
                  >
                    🚀 CREAR E INICIAR COMPETICIÓN
                  </button>

                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast de Guardado */}
      {saveToast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black font-header font-black text-xs uppercase tracking-wider px-5 py-3 shadow-2xl flex items-center gap-2 border border-emerald-400/20">
          <span className="text-sm">✓</span>
          {saveToast.message}
        </div>
      )}

      {/* Modal de Confirmación de Salida */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 max-w-md w-full flex flex-col gap-6 shadow-2xl relative">
            <button
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-header font-black text-sm cursor-pointer"
            >
              ×
            </button>
            <div className="text-center">
              <h3 className="font-header font-black text-lg text-white uppercase tracking-tight">
                ¿Guardar cambios antes de salir?
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-sans font-bold">
                Has realizado modificaciones en el torneo. Guarda tu progreso para que los cambios queden registrados con la fecha actual.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmExitAndSave}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-header font-black uppercase text-xs tracking-wider transition-all cursor-pointer text-center"
              >
                Guardar y Salir
              </button>
              <button
                onClick={confirmExitWithoutSaving}
                className="w-full py-3 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white font-header font-black uppercase text-xs tracking-wider transition-all cursor-pointer text-center"
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="w-full py-3 text-zinc-500 hover:text-zinc-450 font-header font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

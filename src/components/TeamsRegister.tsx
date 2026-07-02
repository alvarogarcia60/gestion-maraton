'use client';

import React, { useState, useRef } from 'react';
import { Team } from '@/types';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';
import { Shield, Plus, Upload, FileText, Trash2, ExternalLink, Loader2, Sparkles, Users } from 'lucide-react';

interface TeamsRegisterProps {
  registeredTeams: Team[];
  setRegisteredTeams: React.Dispatch<React.SetStateAction<Team[]>>;
}

export default function TeamsRegister({ registeredTeams, setRegisteredTeams }: TeamsRegisterProps) {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("⚽"); // Emoji por defecto
  const [file, setFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para la gestión de plantillas
  const [selectedTeamForSquad, setSelectedTeamForSquad] = useState<Team | null>(null);
  const [playerFirstName, setPlayerFirstName] = useState("");
  const [playerLastName, setPlayerLastName] = useState("");
  const [playerJerseyNumber, setPlayerJerseyNumber] = useState("");
  const [playerDni, setPlayerDni] = useState("");

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamForSquad) return;
    if (!playerFirstName.trim() || !playerLastName.trim()) return;

    const newPlayer = {
      id: `p_${Date.now()}`,
      firstName: playerFirstName.trim(),
      lastName: playerLastName.trim(),
      jerseyNumber: playerJerseyNumber ? parseInt(playerJerseyNumber, 10) : undefined,
      dni: playerDni.trim() || undefined
    };

    const updatedTeams = registeredTeams.map(t => {
      if (t.id !== selectedTeamForSquad.id) return t;
      const playersList = t.players ?? [];
      return {
        ...t,
        players: [...playersList, newPlayer]
      };
    });

    setRegisteredTeams(updatedTeams);
    
    const updatedTeam = updatedTeams.find(t => t.id === selectedTeamForSquad.id)!;
    setSelectedTeamForSquad(updatedTeam);

    setPlayerFirstName("");
    setPlayerLastName("");
    setPlayerJerseyNumber("");
    setPlayerDni("");
  };

  const handleRemovePlayer = (playerId: string) => {
    if (!selectedTeamForSquad) return;
    
    const updatedTeams = registeredTeams.map(t => {
      if (t.id !== selectedTeamForSquad.id) return t;
      const playersList = t.players ?? [];
      return {
        ...t,
        players: playersList.filter(p => p.id !== playerId)
      };
    });

    setRegisteredTeams(updatedTeams);

    const updatedTeam = updatedTeams.find(t => t.id === selectedTeamForSquad.id)!;
    setSelectedTeamForSquad(updatedTeam);
  };

  // Emojis de equipo sugeridos para logos rápidos
  const LOGO_PRESETS = ["⚽", "👑", "⚡", "🦁", "🐉", "🦅", "🐺", "🛡️", "🔥", "🟢", "🔴", "🔵", "🟡"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRegisterTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("El nombre del equipo es obligatorio.");
      return;
    }

    setIsUploading(true);

    try {
      let hojaUrl = "";

      if (file) {
        if (isSupabaseConfigured()) {
          // Subida real a Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `hojas/${fileName}`;

          const { error: uploadError, data } = await supabase.storage
            .from('inscripciones')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw new Error(`Error en Supabase Storage: ${uploadError.message}`);
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('inscripciones')
            .getPublicUrl(filePath);

          hojaUrl = publicUrl;
        } else {
          // Modo offline: Crear una URL local temporal (blob)
          hojaUrl = URL.createObjectURL(file);
        }
      }

      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name: name.trim(),
        logoUrl: logo,
        hojaInscripcionUrl: hojaUrl || undefined
      };

      // Si Supabase está en línea, guardamos en la base de datos
      if (isSupabaseConfigured()) {
        const { error: dbError } = await supabase
          .from('teams')
          .insert({
            name: newTeam.name,
            logo_url: newTeam.logoUrl,
            hoja_inscripcion_url: newTeam.hojaInscripcionUrl,
            // ID temporal en base de datos será generado por supabase, pero usamos el devuelto si fuera el caso
          });

        if (dbError) {
          throw new Error(`Error en base de datos: ${dbError.message}`);
        }
      }

      setRegisteredTeams(prev => [...prev, newTeam]);
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      setSuccessMessage(
        isSupabaseConfigured()
          ? "Equipo registrado y hoja guardada en Supabase Storage."
          : "Equipo registrado con éxito (Modo local temporal activo)."
      );
    } catch (error: any) {
      setErrorMessage(error.message || "Error al registrar el equipo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar al equipo ${name}?`)) {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('teams').delete().eq('name', name);
          if (error) throw error;
        } catch (err: any) {
          console.error("Error al eliminar de la DB:", err.message);
        }
      }
      setRegisteredTeams(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">
      
      {/* Columna Izquierda: Formulario de Registro */}
      <div className="flex-1 max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-none shadow-2xl h-fit">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-5">
          <Shield className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h2 className="font-header font-black text-lg uppercase tracking-wider text-white">Registro de Clubes</h2>
        </div>

        <form onSubmit={handleRegisterTeam} className="flex flex-col gap-4">
          
          {/* Nombre del Equipo */}
          <div className="flex flex-col gap-1.5">
            <label className="font-header font-black text-[10px] uppercase text-zinc-450 tracking-wider">Nombre Oficial</label>
            <input 
              type="text" 
              placeholder="Ej: PIO FC..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 px-3 bg-zinc-950 border border-zinc-800 rounded-none text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none"
            />
          </div>

          {/* Selector de Emojis/Logos Rápidos */}
          <div className="flex flex-col gap-1.5">
            <label className="font-header font-black text-[10px] uppercase text-zinc-450 tracking-wider">Insignia / Escudo</label>
            <div className="flex flex-wrap gap-2 p-3 bg-zinc-950 border border-zinc-800">
              {LOGO_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLogo(p)}
                  className={`w-7 h-7 flex items-center justify-center text-sm transition-all border cursor-pointer ${
                    logo === p ? 'bg-yellow-400 border-yellow-400 text-black scale-110' : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Subida de Ficha */}
          <div className="flex flex-col gap-1.5">
            <label className="font-header font-black text-[10px] uppercase text-zinc-450 tracking-wider">
              Subir Hoja de Inscripción (PDF/Imagen)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 cursor-pointer transition-colors group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-zinc-550 group-hover:text-yellow-400 transition-colors mb-2" />
                  <p className="text-[10px] font-header font-bold text-zinc-500 uppercase tracking-widest">
                    {file ? file.name : "Subir Ficha Firmada"}
                  </p>
                  <p className="text-[9px] text-zinc-650 mt-1">PDF, PNG o JPG hasta 5MB</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf, image/*"
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          {/* Avisos */}
          {errorMessage && (
            <p className="text-xs font-semibold text-rose-500 bg-rose-500/10 p-3 border border-rose-500/20">
              ⚠️ {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-3 border border-emerald-500/20">
              ✓ {successMessage}
            </p>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={isUploading}
            className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black uppercase tracking-wider rounded-none transition-all shadow-md shadow-yellow-400/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                Registrando en la Nube...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-black" />
                Dar de Alta Club
              </>
            )}
          </button>
        </form>
      </div>

      {/* Columna Derecha: Listado de Equipos Inscritos */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 p-6 rounded-none shadow-2xl h-fit">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-400" />
            <h2 className="font-header font-black text-lg uppercase tracking-wider text-white">
              Clubes Oficiales ({registeredTeams.length})
            </h2>
          </div>
          {!isSupabaseConfigured() && (
            <span className="text-[9px] font-header font-black bg-zinc-850 border border-zinc-800 text-zinc-500 px-2 py-0.5 uppercase tracking-widest">
              Modo Local/Offline
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {registeredTeams.map(team => (
            <div 
              key={team.id}
              className="bg-zinc-950 border border-zinc-850 p-4 rounded-none flex items-center justify-between hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-center gap-3 truncate w-8/12">
                <div className="w-9 h-9 bg-zinc-900 flex items-center justify-center text-lg border border-zinc-850">
                  {team.logoUrl}
                </div>
                <div className="truncate">
                  <h3 className="font-header font-black text-sm uppercase text-white truncate">{team.name}</h3>
                  <span className="text-[9px] font-header font-bold text-zinc-550 uppercase tracking-widest">
                    ID: {team.id.replace('team_', '')}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                {team.hojaInscripcionUrl ? (
                  <a
                    href={team.hojaInscripcionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center bg-yellow-400 text-black hover:bg-yellow-500 rounded-none transition-colors shadow-sm"
                    title="Ver Ficha de Inscripción"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div 
                    className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-850 text-zinc-650 cursor-not-allowed"
                    title="Sin Ficha Adjunta"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTeamForSquad(team)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-850 hover:border-yellow-400 hover:text-yellow-400 text-zinc-450 rounded-none transition-all cursor-pointer"
                  title="Gestionar Plantilla"
                >
                  <Users className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDeleteTeam(team.id, team.name)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-zinc-850 hover:bg-rose-950/40 text-zinc-450 hover:text-rose-500 rounded-none transition-all cursor-pointer"
                  title="Eliminar Equipo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {registeredTeams.length === 0 && (
            <div className="col-span-full py-10 text-center border border-dashed border-zinc-800 text-zinc-550">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-zinc-650" />
              <p className="font-header font-bold text-xs uppercase tracking-widest">Ningún club registrado</p>
              <p className="text-[10px] text-zinc-600 font-sans mt-1">Usa el formulario para dar de alta a los primeros equipos.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: GESTIÓN DE PLANTILLA */}
      {selectedTeamForSquad && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-850 p-6 max-w-xl w-full flex flex-col gap-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedTeamForSquad(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white font-header font-black text-xs uppercase cursor-pointer"
            >
              Cerrar ×
            </button>

            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <span className="text-xl">{selectedTeamForSquad.logoUrl}</span>
              <div>
                <h3 className="font-header font-black text-base uppercase text-white leading-none">
                  Plantilla de {selectedTeamForSquad.name}
                </h3>
                <span className="text-[9px] font-header font-bold text-zinc-550 uppercase tracking-widest mt-1 block">
                  Total Jugadores: {selectedTeamForSquad.players?.length ?? 0}
                </span>
              </div>
            </div>

            {/* Formulario para Añadir Jugador */}
            <form onSubmit={handleAddPlayer} className="bg-zinc-950 p-4 border border-zinc-850 flex flex-col gap-3">
              <span className="font-header font-black text-[9px] uppercase tracking-wider text-yellow-400">
                Dar de Alta Nuevo Jugador
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-500">Nombre</label>
                  <input
                    type="text"
                    required
                    value={playerFirstName}
                    onChange={(e) => setPlayerFirstName(e.target.value)}
                    className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                    placeholder="Ej: Iker"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-500">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={playerLastName}
                    onChange={(e) => setPlayerLastName(e.target.value)}
                    className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                    placeholder="Ej: Casillas"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-500">Dorsal</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerJerseyNumber}
                    onChange={(e) => setPlayerJerseyNumber(e.target.value)}
                    className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                    placeholder="Ej: 1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-header font-black text-[9px] uppercase text-zinc-500">DNI / ID</label>
                  <input
                    type="text"
                    value={playerDni}
                    onChange={(e) => setPlayerDni(e.target.value)}
                    className="h-8 px-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-sans focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                    placeholder="Ej: 12345678X"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-9 bg-yellow-400 hover:bg-yellow-500 text-black font-header font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
              >
                + Añadir a la Plantilla
              </button>
            </form>

            {/* Listado de Jugadores */}
            <div className="flex-1 overflow-y-auto max-h-[200px] border border-zinc-800">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 font-header font-bold text-[9px] tracking-wider uppercase border-b border-zinc-800">
                    <th className="p-2 w-12 text-center">Dorsal</th>
                    <th className="p-2">Jugador</th>
                    <th className="p-2 w-28">DNI</th>
                    <th className="p-2 w-20 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-950/40">
                  {(selectedTeamForSquad.players ?? []).length > 0 ? (
                    (selectedTeamForSquad.players ?? []).map(p => (
                      <tr key={p.id} className="hover:bg-zinc-850/30 transition-colors">
                        <td className="p-2 text-center font-bold text-yellow-400">{p.jerseyNumber ?? '-'}</td>
                        <td className="p-2 font-header font-black uppercase text-[11px] text-zinc-300">
                          {p.firstName} {p.lastName}
                        </td>
                        <td className="p-2 text-zinc-500 font-mono">{p.dni ?? '-'}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePlayer(p.id)}
                            className="text-rose-500 hover:text-rose-450 font-bold uppercase text-[9px] cursor-pointer"
                            title="Eliminar Jugador"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-550 italic">
                        La plantilla está vacía. Añade jugadores arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

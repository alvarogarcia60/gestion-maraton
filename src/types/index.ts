export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  dni?: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
  hojaInscripcionUrl?: string;
  players?: Player[];
}

export interface GroupTeam {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  coef: number;
  coefGoles: number;
}

export interface Match {
  id: string;
  phaseId: string;
  groupId?: string; // opcional para liguilla
  homeTeamId: string | null; // puede ser null si está por determinar
  awayTeamId: string | null; // puede ser null si está por determinar
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  status: 'scheduled' | 'played' | 'postponed';
  scheduledTime?: string;
  fechaHora?: string; // Formato YYYY-MM-DDTHH:mm
  pistaCampo?: string; // Nombre del campo o pista
  roundName: string; // ej. "Jornada 1", "Cuartos", "Semifinal", "Final"
  nextMatchId?: string | null; // id del siguiente partido al que avanza el ganador
  nextMatchPosition?: 'home' | 'away' | null; // indica si avanza como local o visitante en el siguiente
}

export interface Group {
  id: string;
  phaseId: string;
  name: string;
  teams: Team[];
  standings: GroupTeam[];
  matches: Match[];
}

export interface Phase {
  id: string;
  tournamentId: string;
  name: string;
  type: 'group_stage' | 'knockout';
  orderIndex: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  goals: number;
}

export interface GoalkeeperStats {
  playerId: string;
  playerName: string;
  goalsConceded: number;
  matchesPlayed: number;
}

export interface MatchStats {
  matchId: string;
  scorers: PlayerStats[];
  goalkeepers: GoalkeeperStats[];
}

export interface SavedTournament {
  id: string;
  name: string;
  sport: string;
  logoUrl: string;
  lastModified: string; // ISO string
  config: {
    tournamentName: string;
    sport: string;
    logoUrl: string;
    theme: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
      cardBackgroundColor: string;
      fontFamilyHeader: string;
      fontFamilyData: string;
    };
  };
  registeredTeams: Team[];
  groups: Group[];
  knockoutMatches: Match[];
  matchStats: Record<string, MatchStats>;
  activeTab: 'teamsRegister' | 'registration' | 'groupStage' | 'bracket' | 'stats';
}


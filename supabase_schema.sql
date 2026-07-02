-- Habilitar la extensión para generar UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla: Torneos
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'Fútbol 7',
    theme_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'finished')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Equipos
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    logo_url TEXT,
    hoja_inscripcion_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Jugadores
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    jersey_number INTEGER,
    dni TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Fases
CREATE TABLE IF NOT EXISTS phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- e.g., 'Fase de Grupos', 'Fase Eliminatoria'
    type TEXT NOT NULL CHECK (type IN ('group_stage', 'knockout')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: Grupos (Solo para fases de liguilla)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES phases(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL -- e.g., 'Grupo A', 'Grupo B'
);

-- Tabla Relacional: Equipos en Grupos (Estadísticas y Clasificación)
CREATE TABLE IF NOT EXISTS group_teams (
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    drawn INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (group_id, team_id)
);

-- Tabla: Partidos
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES phases(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL si es eliminatoria directa
    home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- NULL si aún no se ha decidido (ej. bracket de eliminatorias)
    away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL, -- NULL si aún no se ha decidido
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'played', 'postponed')) DEFAULT 'scheduled',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    fecha_hora TIMESTAMP WITH TIME ZONE,
    pista_campo TEXT,
    round_name TEXT NOT NULL, -- e.g., 'Jornada 1', 'Cuartos de final 1'
    next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL, -- Para ligar cruces
    next_match_position TEXT CHECK (next_match_position IN ('home', 'away')), -- Indica si avanza como local o visitante
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índices para optimizar consultas habituales
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_phases_tournament_id ON phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_groups_phase_id ON groups(phase_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase_id ON matches(phase_id);
CREATE INDEX IF NOT EXISTS idx_matches_group_id ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_next_match_id ON matches(next_match_id);

-- Configuración de Supabase Storage para el Bucket 'inscripciones'
-- Nota: Requiere permisos de administrador en la base de datos de Supabase.
-- También se puede configurar directamente desde el panel de control web de Supabase en 'Storage'.
INSERT INTO storage.buckets (id, name, public)
VALUES ('inscripciones', 'inscripciones', true)
ON CONFLICT (id) DO NOTHING;

-- Crear políticas de acceso público para el bucket 'inscripciones' (Lectura y Escritura)
CREATE POLICY "Permitir lectura pública en inscripciones"
ON storage.objects FOR SELECT
USING (bucket_id = 'inscripciones');

CREATE POLICY "Permitir inserción pública en inscripciones"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inscripciones');


import { Team, Match, GroupTeam, Group } from '@/types';

// Algoritmo de Calendario Round-Robin (Todos contra todos - Método de la Rueda)
export function generateRoundRobin(teams: Team[], phaseId: string, groupId?: string): Match[] {
  const matches: Match[] = [];
  const list = [...teams];
  
  if (list.length === 0) return [];
  if (list.length % 2 !== 0) {
    list.push({ id: 'BYE', name: 'DESCANSO' });
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    const roundName = `Jornada ${round + 1}`;
    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex++) {
      // Rotar los índices manteniendo el primero fijo
      let homeIdx = (round + matchIndex) % (numTeams - 1);
      let awayIdx = (numTeams - 1 - matchIndex + round) % (numTeams - 1);

      if (matchIndex === 0) {
        awayIdx = numTeams - 1;
      }

      // Alternar localía en cada ronda para equilibrar
      if (round % 2 === 1) {
        const temp = homeIdx;
        homeIdx = awayIdx;
        awayIdx = temp;
      }

      const home = list[homeIdx];
      const away = list[awayIdx];

      if (home.id !== 'BYE' && away.id !== 'BYE') {
        matches.push({
          id: `${phaseId}-g-${groupId || 'g'}-r${round}-m${matchIndex}`,
          phaseId,
          groupId,
          homeTeamId: home.id,
          awayTeamId: away.id,
          status: 'scheduled',
          roundName,
        });
      }
    }
  }
  return matches;
}

// Calcular Tabla de Clasificación
export function calculateStandings(
  teams: Team[],
  matches: Match[],
  sortBy: 'points' | 'coef' = 'points'
): GroupTeam[] {
  const standingsMap: Record<string, GroupTeam> = {};
  
  teams.forEach(team => {
    standingsMap[team.id] = {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      coef: 0,
      coefGoles: 0
    };
  });

  matches.forEach(match => {
    if (match.status !== 'played' || match.homeScore === undefined || match.awayScore === undefined) {
      return;
    }
    const home = standingsMap[match.homeTeamId || ''];
    const away = standingsMap[match.awayTeamId || ''];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }
  });

  // Calcular coeficientes
  const list = Object.values(standingsMap).map(s => {
    s.coef = s.played > 0 ? Number((s.points / s.played).toFixed(3)) : 0;
    s.coefGoles = s.played > 0 ? Number(((s.goalsFor - s.goalsAgainst) / s.played).toFixed(3)) : 0;
    return s;
  });

  // Criterios de desempate y ordenación
  return list.sort((a, b) => {
    if (sortBy === 'coef') {
      if (b.coef !== a.coef) {
        return b.coef - a.coef;
      }
      if (b.coefGoles !== a.coefGoles) {
        return b.coefGoles - a.coefGoles;
      }
    } else {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) {
        return gdB - gdA;
      }
    }
    return b.goalsFor - a.goalsFor;
  });
}

// 8 Equipos de ejemplo para Fútbol 7 con jugadores de prueba
export const MOCK_TEAMS: Team[] = [
  { 
    id: 't1', 
    name: 'Real Madrid F7', 
    logoUrl: '⚪',
    players: [
      { id: 'p1_1', firstName: 'Raúl', lastName: 'González', jerseyNumber: 7 },
      { id: 'p1_2', firstName: 'Zinedine', lastName: 'Zidane', jerseyNumber: 5 },
      { id: 'p1_3', firstName: 'Iker', lastName: 'Casillas', jerseyNumber: 1 },
      { id: 'p1_4', firstName: 'Ronaldo', lastName: 'Nazário', jerseyNumber: 9 }
    ]
  },
  { 
    id: 't2', 
    name: 'Barcelona F7', 
    logoUrl: '🔵',
    players: [
      { id: 'p2_1', firstName: 'Lionel', lastName: 'Messi', jerseyNumber: 10 },
      { id: 'p2_2', firstName: 'Ronaldinho', lastName: 'Gaucho', jerseyNumber: 8 },
      { id: 'p2_3', firstName: 'Víctor', lastName: 'Valdés', jerseyNumber: 1 },
      { id: 'p2_4', firstName: 'Andrés', lastName: 'Iniesta', jerseyNumber: 6 }
    ]
  },
  { 
    id: 't3', 
    name: 'Atlético de Madrid F7', 
    logoUrl: '🔴',
    players: [
      { id: 'p3_1', firstName: 'Antoine', lastName: 'Griezmann', jerseyNumber: 7 },
      { id: 'p3_2', firstName: 'Fernando', lastName: 'Torres', jerseyNumber: 9 },
      { id: 'p3_3', firstName: 'Jan', lastName: 'Oblak', jerseyNumber: 13 },
      { id: 'p3_4', firstName: 'Koke', lastName: 'Resurrección', jerseyNumber: 8 }
    ]
  },
  { 
    id: 't4', 
    name: 'Sevilla F7', 
    logoUrl: '⚪',
    players: [
      { id: 'p4_1', firstName: 'Jesús', lastName: 'Navas', jerseyNumber: 16 },
      { id: 'p4_2', firstName: 'Luuk', lastName: 'de Jong', jerseyNumber: 9 },
      { id: 'p4_3', firstName: 'Yassine', lastName: 'Bounou', jerseyNumber: 13 },
      { id: 'p4_4', firstName: 'Ivan', lastName: 'Rakitic', jerseyNumber: 10 }
    ]
  },
  { 
    id: 't5', 
    name: 'Betis F7', 
    logoUrl: '🟢',
    players: [
      { id: 'p5_1', firstName: 'Joaquín', lastName: 'Sánchez', jerseyNumber: 17 },
      { id: 'p5_2', firstName: 'Nabil', lastName: 'Fekir', jerseyNumber: 10 },
      { id: 'p5_3', firstName: 'Claudio', lastName: 'Bravo', jerseyNumber: 1 },
      { id: 'p5_4', firstName: 'Sergio', lastName: 'Canales', jerseyNumber: 10 }
    ]
  },
  { 
    id: 't6', 
    name: 'Athletic Club F7', 
    logoUrl: '🔴',
    players: [
      { id: 'p6_1', firstName: 'Iñaki', lastName: 'Williams', jerseyNumber: 9 },
      { id: 'p6_2', firstName: 'Iker', lastName: 'Muniain', jerseyNumber: 10 },
      { id: 'p6_3', firstName: 'Unai', lastName: 'Simón', jerseyNumber: 1 },
      { id: 'p6_4', firstName: 'Raúl', lastName: 'García', jerseyNumber: 22 }
    ]
  },
  { 
    id: 't7', 
    name: 'Real Sociedad F7', 
    logoUrl: '🔵',
    players: [
      { id: 'p7_1', firstName: 'Mikel', lastName: 'Oyarzabal', jerseyNumber: 10 },
      { id: 'p7_2', firstName: 'David', lastName: 'Silva', jerseyNumber: 21 },
      { id: 'p7_3', firstName: 'Álex', lastName: 'Remiro', jerseyNumber: 1 },
      { id: 'p7_4', firstName: 'Alexander', lastName: 'Isak', jerseyNumber: 19 }
    ]
  },
  { 
    id: 't8', 
    name: 'Villarreal F7', 
    logoUrl: '🟡',
    players: [
      { id: 'p8_1', firstName: 'Gerard', lastName: 'Moreno', jerseyNumber: 7 },
      { id: 'p8_2', firstName: 'Dani', lastName: 'Parejo', jerseyNumber: 10 },
      { id: 'p8_3', firstName: 'Gerónimo', lastName: 'Rulli', jerseyNumber: 1 },
      { id: 'p8_4', firstName: 'Yeremy', lastName: 'Pino', jerseyNumber: 21 }
    ]
  }
];

// Generar configuración inicial de dos grupos
export function getInitialGroups(phaseId: string): Group[] {
  const groupA_Teams = MOCK_TEAMS.slice(0, 4);
  const groupB_Teams = MOCK_TEAMS.slice(4, 8);

  const groupA_Matches = generateRoundRobin(groupA_Teams, phaseId, 'group-a');
  const groupB_Matches = generateRoundRobin(groupB_Teams, phaseId, 'group-b');

  return [
    {
      id: 'group-a',
      phaseId,
      name: 'Grupo A',
      teams: groupA_Teams,
      standings: calculateStandings(groupA_Teams, groupA_Matches),
      matches: groupA_Matches
    },
    {
      id: 'group-b',
      phaseId,
      name: 'Grupo B',
      teams: groupB_Teams,
      standings: calculateStandings(groupB_Teams, groupB_Matches),
      matches: groupB_Matches
    }
  ];
}

// Inicializar Árbol de Cruces (Semifinales y Final)
export function getInitialKnockoutMatches(phaseId: string): Match[] {
  const finalId = `${phaseId}-final`;
  
  const semi1Id = `${phaseId}-semi-1`;
  const semi2Id = `${phaseId}-semi-2`;

  return [
    {
      id: semi1Id,
      phaseId,
      homeTeamId: null, // Clasificado 1º Grupo A (TBD)
      awayTeamId: null, // Clasificado 2º Grupo B (TBD)
      status: 'scheduled',
      roundName: 'Semifinales',
      nextMatchId: finalId,
      nextMatchPosition: 'home'
    },
    {
      id: semi2Id,
      phaseId,
      homeTeamId: null, // Clasificado 1º Grupo B (TBD)
      awayTeamId: null, // Clasificado 2º Grupo A (TBD)
      status: 'scheduled',
      roundName: 'Semifinales',
      nextMatchId: finalId,
      nextMatchPosition: 'away'
    },
    {
      id: finalId,
      phaseId,
      homeTeamId: null, // Ganador Semi 1 (TBD)
      awayTeamId: null, // Ganador Semi 2 (TBD)
      status: 'scheduled',
      roundName: 'Final',
      nextMatchId: null,
      nextMatchPosition: null
    }
  ];
}

// Generar orden de sembrado estándar (Seeding Order) para un tamaño de cuadro
export function getSeedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const nextOrder: number[] = [];
    const target = order.length * 2 + 1;
    for (const x of order) {
      nextOrder.push(x);
      nextOrder.push(target - x);
    }
    order = nextOrder;
  }
  return order;
}

// Generador dinámico de árbol de eliminatorias con soporte para Byes
export function generateKnockoutMatches(qualifiedTeams: Team[], phaseId: string): Match[] {
  const n = qualifiedTeams.length;
  if (n === 0) return [];

  // Calcular tamaño del cuadro (potencia de 2)
  let bracketSize = 2;
  while (bracketSize < n) {
    bracketSize *= 2;
  }

  const numRounds = Math.log2(bracketSize);
  const matches: Match[] = [];
  const matchesMap: Record<string, Match> = {};

  // 1. Generar todos los partidos vacíos por rondas, de la final (L=0) a la primera ronda (L=R-1)
  for (let L = 0; L < numRounds; L++) {
    const numMatches = Math.pow(2, L);
    let roundName = '';
    if (L === 0) roundName = 'Final';
    else if (L === 1) roundName = 'Semifinales';
    else if (L === 2) roundName = 'Cuartos de final';
    else if (L === 3) roundName = 'Octavos de final';
    else if (L === 4) roundName = 'Dieciseisavos de final';
    else roundName = `Ronda de ${numMatches * 2}`;

    for (let i = 0; i < numMatches; i++) {
      const matchId = `${phaseId}-L${L}-M${i}`;
      const nextMatchId = L > 0 ? `${phaseId}-L${L-1}-M${Math.floor(i / 2)}` : null;
      const nextMatchPosition = L > 0 ? (i % 2 === 0 ? 'home' : 'away') : null;

      const match: Match = {
        id: matchId,
        phaseId,
        homeTeamId: null,
        awayTeamId: null,
        status: 'scheduled',
        roundName,
        nextMatchId,
        nextMatchPosition
      };

      matches.push(match);
      matchesMap[matchId] = match;
    }
  }

  // 2. Sembrar los equipos en la primera ronda (L = numRounds - 1)
  const firstRoundLevel = numRounds - 1;
  const numFirstRoundMatches = Math.pow(2, firstRoundLevel);
  const seedOrder = getSeedOrder(bracketSize);

  for (let i = 0; i < numFirstRoundMatches; i++) {
    const matchId = `${phaseId}-L${firstRoundLevel}-M${i}`;
    const match = matchesMap[matchId];
    if (!match) continue;

    const seedHome = seedOrder[2 * i];
    const seedAway = seedOrder[2 * i + 1];

    match.homeTeamId = seedHome <= n ? qualifiedTeams[seedHome - 1].id : 'BYE';
    match.awayTeamId = seedAway <= n ? qualifiedTeams[seedAway - 1].id : 'BYE';
  }

  // 3. Resolver los Byes en cascada de abajo hacia arriba
  for (let L = firstRoundLevel; L >= 0; L--) {
    const numMatches = Math.pow(2, L);
    for (let i = 0; i < numMatches; i++) {
      const matchId = `${phaseId}-L${L}-M${i}`;
      const match = matchesMap[matchId];
      if (!match) continue;

      const homeBye = match.homeTeamId === 'BYE';
      const awayBye = match.awayTeamId === 'BYE';

      if (homeBye && awayBye) {
        match.status = 'played';
        match.homeScore = 0;
        match.awayScore = 0;
        propagateWinner(match, 'BYE');
      } else if (homeBye && match.awayTeamId && match.awayTeamId !== 'BYE') {
        match.status = 'played';
        match.homeScore = 0;
        match.awayScore = 1;
        propagateWinner(match, match.awayTeamId);
      } else if (awayBye && match.homeTeamId && match.homeTeamId !== 'BYE') {
        match.status = 'played';
        match.homeScore = 1;
        match.awayScore = 0;
        propagateWinner(match, match.homeTeamId);
      }
    }
  }

  function propagateWinner(currentMatch: Match, winnerId: string) {
    if (!currentMatch.nextMatchId) return;
    const nextMatch = matchesMap[currentMatch.nextMatchId];
    if (!nextMatch) return;

    if (currentMatch.nextMatchPosition === 'home') {
      nextMatch.homeTeamId = winnerId;
    } else {
      nextMatch.awayTeamId = winnerId;
    }
  }

  // Devolver los partidos en orden inverso para que BracketTree dibuje primero la ronda inicial
  return matches.reverse();
}

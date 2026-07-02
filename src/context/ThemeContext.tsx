'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  cardBackgroundColor: string;
  fontFamilyHeader: string;
  fontFamilyData: string;
}

export interface TournamentConfig {
  tournamentName: string;
  sport: string;
  logoUrl: string;
  theme: ThemeConfig;
}

interface ThemeContextProps {
  config: TournamentConfig;
  setTournamentConfig: (config: TournamentConfig) => void;
}

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

// Tema DAZN / Kings Cup Industrial por Defecto
export const defaultTournament: TournamentConfig = {
  tournamentName: "KINGS CUP F7",
  sport: "FÚTBOL 7",
  logoUrl: "👑",
  theme: {
    primaryColor: "#e8ff00", // Amarillo DAZN (#E8FF00)
    secondaryColor: "#ffffff",
    backgroundColor: "#050508", // Negro profundo
    textColor: "#ffffff",
    cardBackgroundColor: "#0e0e12",
    fontFamilyHeader: "var(--font-oswald)",
    fontFamilyData: "var(--font-inter)",
  }
};

const ThemeContext = createContext<ThemeContextProps>({
  config: defaultTournament,
  setTournamentConfig: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<TournamentConfig>(defaultTournament);

  // Cargar tema desde localStorage en el cliente
  useEffect(() => {
    const saved = localStorage.getItem('theme_tournament_config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved theme config:", e);
      }
    }
  }, []);

  // Aplicar variables CSS directamente al documentElement (html)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', config.theme.primaryColor);
    root.style.setProperty('--primary-color-rgb', hexToRgb(config.theme.primaryColor));
    root.style.setProperty('--secondary-color', config.theme.secondaryColor);
    root.style.setProperty('--secondary-color-rgb', hexToRgb(config.theme.secondaryColor));
    root.style.setProperty('--background-color', config.theme.backgroundColor);
    root.style.setProperty('--text-color', config.theme.textColor);
    root.style.setProperty('--card-bg', config.theme.cardBackgroundColor);
    root.style.setProperty('--font-family-header', config.theme.fontFamilyHeader);
    root.style.setProperty('--font-family-data', config.theme.fontFamilyData);
  }, [config]);

  const setTournamentConfig = (newConfig: TournamentConfig) => {
    setConfig(newConfig);
    localStorage.setItem('theme_tournament_config', JSON.stringify(newConfig));
  };

  return (
    <ThemeContext.Provider value={{ config, setTournamentConfig }}>
      <div className="min-h-screen bg-theme-bg text-theme-text transition-all duration-300">
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

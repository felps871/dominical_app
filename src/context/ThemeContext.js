import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definição das paletas de cores do app
export const lightTheme = {
  dark: false,
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#64748B',
  border: '#E2E8F0',
  primary: '#2563EB',
  inputBackground: '#F1F5F9',
  statusBar: 'dark-content',
};

export const darkTheme = {
  dark: true,
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#334155',
  primary: '#3B82F6',
  inputBackground: '#334155',
  statusBar: 'light-content',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Padrão escuro
  const [loading, setLoading] = useState(true);

  // Carregar o tema salvo quando o app abre
  useEffect(() => {
    carregarTemaSalvo();
  }, []);

  const carregarTemaSalvo = async () => {
    try {
      const temaSalvo = await AsyncStorage.getItem('@app_theme');
      if (temaSalvo !== null) {
        setIsDarkMode(temaSalvo === 'dark');
      }
    } catch (error) {
      console.log('Erro ao carregar tema:', error);
    } finally {
      setLoading(false);
    }
  };

  // Alternar o tema e salvar a preferência
  const toggleTheme = async () => {
    try {
      const novoEstado = !isDarkMode;
      setIsDarkMode(novoEstado);
      await AsyncStorage.setItem('@app_theme', novoEstado ? 'dark' : 'light');
    } catch (error) {
      console.log('Erro ao salvar tema:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
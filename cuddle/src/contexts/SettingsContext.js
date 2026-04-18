import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsContext = createContext({
  darkMode: false,
  setDarkMode: () => {},
  language: 'pt',
  setLanguage: () => {},
  theme: {},
});

export function SettingsProvider({ children }) {
  const [darkMode, setDarkModeState] = useState(false);
  const [language, setLanguageState] = useState('pt');

  useEffect(() => {
    async function load() {
      const dm = await AsyncStorage.getItem('app_dark_mode');
      const lang = await AsyncStorage.getItem('app_language');
      if (dm !== null) setDarkModeState(dm === 'true');
      if (lang !== null) setLanguageState(lang);
    }
    load();
  }, []);

  const setDarkMode = async (val) => {
    setDarkModeState(val);
    await AsyncStorage.setItem('app_dark_mode', String(val));
  };

  const setLanguage = async (val) => {
    setLanguageState(val);
    await AsyncStorage.setItem('app_language', val);
  };

  const theme = darkMode ? DARK : LIGHT;

  return (
    <SettingsContext.Provider value={{ darkMode, setDarkMode, language, setLanguage, theme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

// ─── Minimal i18n ──────────────────────────────────────────────────────────────
const STRINGS = {
  pt: {
    home: 'Meus Pets', services: 'Nossos Serviços', schedule: 'Agendamentos',
    profile: 'Meu Perfil', hello: 'Olá', save: 'Salvar', cancel: 'Cancelar',
    logout: 'Sair', darkMode: 'Tema Escuro', language: 'Idioma',
    newAppointment: 'Novo Agendamento', confirm: 'Confirmar',
  },
  en: {
    home: 'My Pets', services: 'Our Services', schedule: 'Appointments',
    profile: 'My Profile', hello: 'Hello', save: 'Save', cancel: 'Cancel',
    logout: 'Logout', darkMode: 'Dark Mode', language: 'Language',
    newAppointment: 'New Appointment', confirm: 'Confirm',
  },
  es: {
    home: 'Mis Mascotas', services: 'Nuestros Servicios', schedule: 'Citas',
    profile: 'Mi Perfil', hello: 'Hola', save: 'Guardar', cancel: 'Cancelar',
    logout: 'Salir', darkMode: 'Modo Oscuro', language: 'Idioma',
    newAppointment: 'Nueva Cita', confirm: 'Confirmar',
  },
};

export function useT() {
  const { language } = useContext(SettingsContext);
  return STRINGS[language] ?? STRINGS.pt;
}

// ─── Theme tokens ──────────────────────────────────────────────────────────────
const LIGHT = {
  bg: '#DBE9EF',
  card: '#F4F4F4',
  cardAlt: '#fff',
  text: '#1E5968',
  textSub: '#5FAFC2',
  textMuted: '#B1DDE7',
  accent: '#1E93AD',
  accentAlt: '#E4B651',
  border: '#E8E8E8',
  navBg: '#F4F4F4',
  headerBg: '#E0F3F8',
};

const DARK = {
  bg: '#0F1F26',
  card: '#1A2E38',
  cardAlt: '#1F3540',
  text: '#E8F6FA',
  textSub: '#7ABFCF',
  textMuted: '#4A7A8A',
  accent: '#2AAAC8',
  accentAlt: '#E4B651',
  border: '#2A4050',
  navBg: '#142530',
  headerBg: '#162A34',
};

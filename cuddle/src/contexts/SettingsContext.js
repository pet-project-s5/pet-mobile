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

// ─── i18n ─────────────────────────────────────────────────────────────────────
const STRINGS = {
  pt: {
    // Navigation
    home: 'Meus Pets', services: 'Nossos Serviços', schedule: 'Agendamentos',
    profile: 'Meu Perfil',
    // Common
    hello: 'Olá', save: 'Salvar', cancel: 'Cancelar', back: 'Voltar',
    logout: 'Sair', darkMode: 'Tema Escuro', language: 'Idioma',
    confirm: 'Confirmar', continue: 'Continuar', edit: 'Editar', new: 'Novo',
    loading: 'Carregando...', saving: 'Salvando...', error: 'Ocorreu um erro.',
    // Schedule list
    newAppointment: 'Novo Agendamento',
    noAppointments: 'Nenhum agendamento encontrado',
    firstAppointment: 'Fazer meu primeiro agendamento',
    cancelAppointment: 'Cancelar agendamento',
    confirmCancelMsg: 'Esta ação não pode ser desfeita. Tem certeza que deseja cancelar?',
    confirmCancelTitle: 'Cancelar agendamento?',
    keep: 'Manter', yesCancelBtn: 'Sim, cancelar', cancelling: 'Cancelando...',
    employee: 'Funcionário', duration: 'Duração', total: 'Total',
    observations: 'Observações',
    // Status badges
    pending: 'Pendente', confirmed: 'Confirmado',
    cancelled: 'Cancelado', completed: 'Concluído', scheduled: 'Agendado',
    // Notifications
    notifications: 'Notificações', clearAll: 'Limpar',
    noNotifications: 'Nenhuma notificação ainda',
    appointmentReminder: 'Lembrete de Agendamento',
    aiTip: 'Dica de IA', careTip: 'Dica de Cuidado',
    aiDisclaimer: 'Gerado por IA · Consulte sempre um veterinário para orientações médicas.',
    // Schedule flow
    choosePet: 'Qual pet você quer agendar?',
    chooseService: 'Qual serviço?',
    chooseDate: 'Escolha a data',
    chooseTime: 'Escolha um horário',
    confirmAppointmentTitle: 'Confirmar Agendamento',
    appointmentConfirmed: 'Agendamento confirmado!',
    viewAppointments: 'Ver meus agendamentos',
    chooseProfessional: 'Escolha o profissional',
    loadingTimes: 'Buscando horários disponíveis...',
    noAvailableTimes: 'Nenhum horário disponível para essa data e serviço. Volte e escolha outra data.',
    servicesTooLong: 'Os serviços selecionados somam mais tempo do que o horário de funcionamento. Reduza a quantidade de serviços.',
    noPets: 'Cadastre um pet primeiro.',
    noServicesForSpecies: 'Nenhum serviço disponível para a espécie deste pet.',
    addExtras: 'Adicionar serviços extras:',
    petLabel: 'Pet', serviceLabel: 'Serviço', dateLabel: 'Data', timeLabel: 'Horário',
    obsOptional: 'Observações (opcional)',
    obsPlaceholder: 'Ex: pet com ansiedade...',
    confirmAppointmentBtn: 'Confirmar Agendamento',
  },
  en: {
    home: 'My Pets', services: 'Our Services', schedule: 'Appointments',
    profile: 'My Profile',
    hello: 'Hello', save: 'Save', cancel: 'Cancel', back: 'Back',
    logout: 'Logout', darkMode: 'Dark Mode', language: 'Language',
    confirm: 'Confirm', continue: 'Continue', edit: 'Edit', new: 'New',
    loading: 'Loading...', saving: 'Saving...', error: 'An error occurred.',
    newAppointment: 'New Appointment',
    noAppointments: 'No appointments found',
    firstAppointment: 'Make my first appointment',
    cancelAppointment: 'Cancel appointment',
    confirmCancelMsg: 'This action cannot be undone. Are you sure you want to cancel?',
    confirmCancelTitle: 'Cancel appointment?',
    keep: 'Keep', yesCancelBtn: 'Yes, cancel', cancelling: 'Cancelling...',
    employee: 'Staff', duration: 'Duration', total: 'Total',
    observations: 'Notes',
    pending: 'Pending', confirmed: 'Confirmed',
    cancelled: 'Cancelled', completed: 'Completed', scheduled: 'Scheduled',
    notifications: 'Notifications', clearAll: 'Clear all',
    noNotifications: 'No notifications yet',
    appointmentReminder: 'Appointment Reminder',
    aiTip: 'AI Tip', careTip: 'Care Tip',
    aiDisclaimer: 'AI generated · Always consult a veterinarian for medical guidance.',
    choosePet: 'Which pet do you want to schedule?',
    chooseService: 'Which service?',
    chooseDate: 'Choose a date',
    chooseTime: 'Choose a time',
    confirmAppointmentTitle: 'Confirm Appointment',
    appointmentConfirmed: 'Appointment confirmed!',
    viewAppointments: 'View my appointments',
    chooseProfessional: 'Choose a professional',
    loadingTimes: 'Loading available times...',
    noAvailableTimes: 'No available times for this date and service. Go back and choose another date.',
    servicesTooLong: 'The selected services exceed the business day hours. Please select fewer services.',
    noPets: 'Register a pet first.',
    noServicesForSpecies: 'No services available for this pet\'s species.',
    addExtras: 'Add extra services:',
    petLabel: 'Pet', serviceLabel: 'Service', dateLabel: 'Date', timeLabel: 'Time',
    obsOptional: 'Notes (optional)',
    obsPlaceholder: 'E.g.: anxious pet...',
    confirmAppointmentBtn: 'Confirm Appointment',
  },
  es: {
    home: 'Mis Mascotas', services: 'Nuestros Servicios', schedule: 'Citas',
    profile: 'Mi Perfil',
    hello: 'Hola', save: 'Guardar', cancel: 'Cancelar', back: 'Volver',
    logout: 'Salir', darkMode: 'Modo Oscuro', language: 'Idioma',
    confirm: 'Confirmar', continue: 'Continuar', edit: 'Editar', new: 'Nuevo',
    loading: 'Cargando...', saving: 'Guardando...', error: 'Ocurrió un error.',
    newAppointment: 'Nueva Cita',
    noAppointments: 'No se encontraron citas',
    firstAppointment: 'Hacer mi primera cita',
    cancelAppointment: 'Cancelar cita',
    confirmCancelMsg: 'Esta acción no se puede deshacer. ¿Estás seguro de que deseas cancelar?',
    confirmCancelTitle: '¿Cancelar cita?',
    keep: 'Mantener', yesCancelBtn: 'Sí, cancelar', cancelling: 'Cancelando...',
    employee: 'Profesional', duration: 'Duración', total: 'Total',
    observations: 'Observaciones',
    pending: 'Pendiente', confirmed: 'Confirmado',
    cancelled: 'Cancelado', completed: 'Completado', scheduled: 'Agendado',
    notifications: 'Notificaciones', clearAll: 'Limpiar',
    noNotifications: 'Sin notificaciones aún',
    appointmentReminder: 'Recordatorio de Cita',
    aiTip: 'Consejo IA', careTip: 'Consejo de Cuidado',
    aiDisclaimer: 'Generado por IA · Consulta siempre a un veterinario para orientación médica.',
    choosePet: '¿Qué mascota quieres agendar?',
    chooseService: '¿Qué servicio?',
    chooseDate: 'Elige una fecha',
    chooseTime: 'Elige un horario',
    confirmAppointmentTitle: 'Confirmar Cita',
    appointmentConfirmed: '¡Cita confirmada!',
    viewAppointments: 'Ver mis citas',
    chooseProfessional: 'Elige un profesional',
    loadingTimes: 'Buscando horarios disponibles...',
    noAvailableTimes: 'No hay horarios disponibles para esta fecha y servicio. Vuelve y elige otra fecha.',
    servicesTooLong: 'Los servicios seleccionados superan el horario de atención. Por favor, selecciona menos servicios.',
    noPets: 'Registra una mascota primero.',
    noServicesForSpecies: 'No hay servicios disponibles para la especie de esta mascota.',
    addExtras: 'Añadir servicios extra:',
    petLabel: 'Mascota', serviceLabel: 'Servicio', dateLabel: 'Fecha', timeLabel: 'Horario',
    obsOptional: 'Observaciones (opcional)',
    obsPlaceholder: 'Ej: mascota con ansiedad...',
    confirmAppointmentBtn: 'Confirmar Cita',
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

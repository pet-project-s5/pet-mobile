import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Kanit_400Regular, Kanit_500Medium, Kanit_600SemiBold, Kanit_700Bold } from '@expo-google-fonts/kanit';
import {
  Calendar, Clock, User, PawPrint,
  Scissors, BadgeCheck, CircleX, Hourglass, CheckCircle2, CalendarCheck,
} from 'lucide-react-native';
import { useSettings } from '../../../contexts/SettingsContext';
import { getIsAdm, getUserId, getUserName } from '../../../services/auth';
import { getAllAppointments } from '../../../services/api';
import BottomNav from '../../Elements/BottomNav';
import LoadingView from '../../Elements/LoadingView';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtTime(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtPrice(v) {
  if (v == null) return '—';
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

// ─── status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  PENDING:   { label: 'Pendente',   color: '#E4B651', Icon: Hourglass },
  CONFIRMED: { label: 'Confirmado', color: '#2EC27E', Icon: BadgeCheck },
  CANCELLED: { label: 'Cancelado',  color: '#DA524D', Icon: CircleX },
  COMPLETED: { label: 'Concluído',  color: '#2794AD', Icon: CheckCircle2 },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: '#2794AD', Icon: BadgeCheck };
  const { Icon } = s;
  return (
    <View style={[badge.wrap, { backgroundColor: s.color + '18', borderColor: s.color + '40' }]}>
      <Icon size={11} color={s.color} />
      <Text style={[badge.text, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  text: { fontSize: 11, fontFamily: 'Kanit_600SemiBold' },
});

// ─── filter tab ───────────────────────────────────────────────────────────────

const FILTERS = [
  { key: null,        label: 'Todos' },
  { key: 'CONFIRMED', label: 'Confirmados' },
  { key: 'PENDING',   label: 'Pendentes' },
  { key: 'COMPLETED', label: 'Concluídos' },
  { key: 'CANCELLED', label: 'Cancelados' },
];

// ─── appointment card ─────────────────────────────────────────────────────────

function AppointmentCard({ appt, theme }) {
  const services = typeof appt.petOfferingNames === 'string'
    ? appt.petOfferingNames
    : Array.isArray(appt.petOfferingNames)
      ? appt.petOfferingNames.join(', ')
      : '—';

  return (
    <View style={[card.wrap, theme.card]}>
      {/* ── header: owner + status ── */}
      <View style={card.header}>
        <View style={card.ownerRow}>
          <View style={[card.avatar, theme.avatarBg]}>
            <User size={14} color="#2794AD" />
          </View>
          <Text style={[card.ownerName, theme.text]} numberOfLines={1}>
            {appt.ownerName ?? `Cliente #${appt.ownerId}`}
          </Text>
        </View>
        <StatusBadge status={appt.status} />
      </View>

      {/* ── divider ── */}
      <View style={[card.divider, theme.divider]} />

      {/* ── pet + service ── */}
      <View style={card.row}>
        <PawPrint size={14} color="#77C9DB" style={card.icon} />
        <Text style={[card.label, theme.subtext]}>Pet</Text>
        <Text style={[card.value, theme.text]} numberOfLines={1}>
          {appt.petName ?? `#${appt.petId}`}
          {appt.petSpecies ? ` · ${appt.petSpecies}` : ''}
        </Text>
      </View>

      <View style={card.row}>
        <Scissors size={14} color="#77C9DB" style={card.icon} />
        <Text style={[card.label, theme.subtext]}>Serviço</Text>
        <Text style={[card.value, theme.text]} numberOfLines={2}>{services}</Text>
      </View>

      {/* ── date + employee ── */}
      <View style={card.row}>
        <Calendar size={14} color="#77C9DB" style={card.icon} />
        <Text style={[card.label, theme.subtext]}>Data</Text>
        <View style={card.dateRow}>
          <Text style={[card.value, theme.text]}>{fmtDate(appt.startDateTime)}</Text>
          <View style={[card.timePill, theme.timePill]}>
            <Clock size={10} color="#2794AD" />
            <Text style={card.timeTxt}>{fmtTime(appt.startDateTime)}</Text>
          </View>
        </View>
      </View>

      {appt.employeeName && (
        <View style={card.row}>
          <BadgeCheck size={14} color="#77C9DB" style={card.icon} />
          <Text style={[card.label, theme.subtext]}>Profissional</Text>
          <Text style={[card.value, theme.text]}>{appt.employeeName}</Text>
        </View>
      )}

      {/* ── footer: price ── */}
      <View style={[card.footer, theme.divider]}>
        <Text style={[card.priceLabel, theme.subtext]}>Total</Text>
        <Text style={card.price}>{fmtPrice(appt.totalPrice)}</Text>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff', borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2F0F5',
    shadowColor: '#0D6E8A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8F7FB', alignItems: 'center', justifyContent: 'center',
  },
  ownerName: { fontSize: 14, fontFamily: 'Kanit_600SemiBold', color: '#1E5968', flex: 1 },
  divider: { height: 1, backgroundColor: '#EEF7FA', marginHorizontal: 14 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingTop: 8, gap: 6,
  },
  icon: { marginTop: 2 },
  label: {
    fontSize: 11, fontFamily: 'Kanit_500Medium',
    color: '#9BB8C1', width: 72, flexShrink: 0,
  },
  value: { fontSize: 13, fontFamily: 'Kanit_400Regular', color: '#1E5968', flex: 1 },
  dateRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#E8F7FB', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10,
  },
  timeTxt: { fontSize: 11, fontFamily: 'Kanit_600SemiBold', color: '#2794AD' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 14, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, paddingBottom: 12,
  },
  priceLabel: { fontSize: 11, fontFamily: 'Kanit_500Medium', color: '#9BB8C1' },
  price: { fontSize: 16, fontFamily: 'Kanit_700Bold', color: '#2794AD' },
});

// ─── main screen ──────────────────────────────────────────────────────────────

export default function AdminAppointments({ navigation, route }) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  const userId   = route?.params?.userId   ?? getUserId();
  const userName = route?.params?.userName ?? getUserName() ?? '';
  const isAdm    = typeof route?.params?.isAdm === 'boolean' ? route.params.isAdm : Boolean(getIsAdm());

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [filter, setFilter]             = useState(null);

  const [fontsLoaded] = useFonts({
    Kanit_400Regular, Kanit_500Medium, Kanit_600SemiBold, Kanit_700Bold,
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getAllAppointments(0, 100);
      setAppointments(data);
    } catch (e) {
      console.warn('AdminAppointments load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!fontsLoaded || loading) return <LoadingView message="Carregando agendamentos..." />;

  const filtered = filter ? appointments.filter((a) => a.status === filter) : appointments;

  const themeCard   = theme.card   ? { backgroundColor: theme.card }   : {};
  const themeText   = theme.text   ? { color: theme.text }   : {};
  const themeSub    = theme.subtext ? { color: theme.subtext } : {};
  const themeDivider = theme.border ? { borderTopColor: theme.border, backgroundColor: theme.border } : {};
  const themeAvatarBg = theme.cardAlt ? { backgroundColor: theme.cardAlt } : {};
  const themeTimePill = theme.cardAlt ? { backgroundColor: theme.cardAlt } : {};

  const cardTheme = { card: themeCard, text: themeText, subtext: themeSub, divider: themeDivider, avatarBg: themeAvatarBg, timePill: themeTimePill };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView edges={['top']}>
        {/* ── header ── */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Agendamentos</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            {filtered.length} de {appointments.length} {appointments.length === 1 ? 'agendamento' : 'agendamentos'}
          </Text>
        </View>

        {/* ── filter chips ── */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => String(f.key)}
          contentContainerStyle={styles.filterList}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      {/* ── list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={[styles.list, { paddingBottom: 74 + insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <CalendarCheck size={52} color="#B1DDE7" />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>
              {filter ? 'Nenhum agendamento com esse status.' : 'Nenhum agendamento encontrado.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <AppointmentCard appt={item} theme={cardTheme} />}
      />

      <BottomNav
        navigation={navigation}
        activeTab="adminAppointments"
        userId={userId}
        userName={userName}
        isAdm={isAdm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FC' },

  header: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  title: {
    fontSize: 22, fontFamily: 'Kanit_700Bold', color: '#1E5968',
  },
  subtitle: {
    fontSize: 12, fontFamily: 'Kanit_400Regular', color: '#9BB8C1', marginTop: 1,
  },

  filterList: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#C8E8F0', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1E93AD', borderColor: '#1E93AD' },
  chipText: { fontSize: 12, fontFamily: 'Kanit_500Medium', color: '#2794AD' },
  chipTextActive: { color: '#fff', fontFamily: 'Kanit_600SemiBold' },

  list: { paddingTop: 8 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: {
    fontSize: 14, fontFamily: 'Kanit_400Regular',
    color: '#9BB8C1', textAlign: 'center', paddingHorizontal: 32,
  },
});

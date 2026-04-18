import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, Modal, Pressable,
} from 'react-native';
import { UserRound, SquarePen, Plus, Bell, Calendar, Sparkles, X, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../../Elements/BottomNav';
import { getPetsByUser, getAppointmentsByUser } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';
import { pickAITip } from '../../../services/groqAI';
import { pickRandomTip } from '../../../services/petTips';
import { getUserPhoto, getPetPhoto } from '../../../services/photoStorage';
import { useSettings, useT } from '../../../contexts/SettingsContext';

const TIP_INTERVAL_MS = 30 * 60 * 1000;
const MAX_NOTIFS = 50;

const EMOJI_MAP = {
  cachorro:'🐶', gato:'🐱', ave:'🐦', peixe:'🐟',
  roedor:'🐹', reptil:'🦎', coelho:'🐰',
};
function getPetEmoji(species = '') {
  return EMOJI_MAP[species.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')] || '🐾';
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function hoursUntil(dt) {
  return (new Date(dt) - Date.now()) / 3_600_000;
}

// ── Notification card ─────────────────────────────────────────────────────────
function NotifCard({ item }) {
  const isAppt = item.type === 'appointment';
  const accent = isAppt ? '#E4B651' : item.isAI ? '#8671FF' : '#2794AD';

  return (
    <View style={[nc.card, { borderLeftColor: accent }]}>
      <View style={nc.row}>
        <View style={[nc.iconBox, { backgroundColor: accent + '22' }]}>
          {isAppt
            ? <Calendar size={16} color={accent} />
            : item.isAI
              ? <Sparkles size={16} color={accent} />
              : <Bell size={16} color={accent} />
          }
        </View>
        <View style={nc.meta}>
          <Text style={[nc.title, { color: accent }]}>
            {isAppt ? 'Lembrete de Agendamento' : item.isAI ? 'Dica de IA' : 'Dica de Cuidado'}
          </Text>
          <Text style={nc.time}>{formatDate(item.ts)}</Text>
        </View>
      </View>

      <Text style={nc.petName}>
        {isAppt
          ? `${item.petName} — ${item.service}`
          : `Para ${item.petName} (${item.species})`
        }
      </Text>

      <Text style={nc.body}>
        {isAppt
          ? `📅 ${new Date(item.startDateTime).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}`
          : item.tip
        }
      </Text>

      {!isAppt && item.isAI && (
        <View style={nc.disclaimer}>
          <Sparkles size={10} color="#8671FF" />
          <Text style={nc.disclaimerText}>
            Gerado por IA · Consulte sempre um veterinário para orientações médicas.
          </Text>
        </View>
      )}
    </View>
  );
}

const nc = StyleSheet.create({
  card: {
    backgroundColor: '#F8FAFB',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  iconBox: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  meta: { flex: 1 },
  title: { fontFamily: 'Kanit_700Bold', fontSize: 13 },
  time: { fontFamily: 'Kanit_400Regular', fontSize: 10, color: '#9BB8C1', marginTop: 1 },
  petName: { fontFamily: 'Kanit_400Regular', color: '#5FAFC2', fontSize: 12, marginBottom: 4 },
  body: { fontFamily: 'Kanit_400Regular', color: '#1E5968', fontSize: 13, lineHeight: 18 },
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 5,
    backgroundColor: '#F3F0FF', borderRadius: 6, padding: 8, marginTop: 8,
  },
  disclaimerText: {
    flex: 1, fontFamily: 'Kanit_400Regular', color: '#8671FF', fontSize: 10, lineHeight: 14,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Home({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const t = useT();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName || 'Tutor';

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPhotoUri, setUserPhotoUri] = useState(null);
  const [petPhotos, setPetPhotos] = useState({});

  const [notifQueue, setNotifQueue] = useState([]);   // newest-first
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const petsRef = useRef([]);
  const intervalRef = useRef(null);
  const seenAppts = useRef(new Set());

  const STORAGE_KEY = `@cuddle:notifs:${userId}`;

  // ── Persist helpers ───────────────────────────────────────────────────────
  async function saveQueue(queue) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_NOTIFS)));
    } catch { /* ignore */ }
  }

  async function loadQueue() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        setNotifQueue(stored);
        // Don't restore unread count — user already saw them before closing the app
      }
    } catch { /* ignore */ }
  }

  // ── Push a new notification ───────────────────────────────────────────────
  const pushNotif = useCallback((notif) => {
    const item = { ...notif, id: notif.id ?? `${notif.type}_${Date.now()}`, ts: notif.ts ?? Date.now() };
    setNotifQueue(prev => {
      const next = [item, ...prev].slice(0, MAX_NOTIFS);
      saveQueue(next);
      return next;
    });
    setUnreadCount(n => n + 1);
  }, []);

  // ── AI tip (with mock fallback) ───────────────────────────────────────────
  const fetchTip = useCallback(async (petList) => {
    if (!petList?.length) return;
    const notif = await pickAITip(petList);
    if (notif) {
      pushNotif(notif);
    } else {
      const fallback = pickRandomTip(petList);
      if (fallback) pushNotif({ type: 'tip', ...fallback, isAI: false });
    }
  }, [pushNotif]);

  // ── Appointment reminders ─────────────────────────────────────────────────
  const checkAppointments = useCallback(async () => {
    if (!userId) return;
    try {
      const appts = await getAppointmentsByUser(userId);
      for (const a of appts) {
        if (!a.startDateTime) continue;
        if (a.status === 'CANCELLED' || a.status === 'COMPLETED') continue;
        const h = hoursUntil(a.startDateTime);
        if (h <= 0 || h > 24) continue;
        if (seenAppts.current.has(a.id)) continue;
        seenAppts.current.add(a.id);
        pushNotif({
          type: 'appointment',
          petName: a.pet?.name ?? 'seu pet',
          service: a.petOfferingNames ?? 'Agendamento',
          startDateTime: a.startDateTime,
        });
      }
    } catch { /* silent */ }
  }, [userId, pushNotif]);

  // ── Focus: refresh photo + check appointments ─────────────────────────────
  useFocusEffect(useCallback(() => {
    getUserPhoto(userId).then(uri => setUserPhotoUri(uri));
    checkAppointments();
  }, [userId, checkAppointments]));

  // ── Load pets + stored notifications on mount ─────────────────────────────
  useEffect(() => {
    loadQueue();

    async function loadPets() {
      try {
        setLoading(true);
        const data = await getPetsByUser(userId);
        setPets(data);
        petsRef.current = data;

        const photos = {};
        await Promise.all(data.map(async p => {
          const uri = await getPetPhoto(p.id);
          if (uri) photos[p.id] = uri;
        }));
        setPetPhotos(photos);

        if (data.length > 0) fetchTip(data);
      } catch (err) {
        console.log('Erro ao carregar pets:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPets();
  }, [userId]);

  // ── Periodic AI tip ───────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (petsRef.current.length > 0) fetchTip(petsRef.current);
    }, TIP_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchTip]);

  const handleBellPress = () => {
    setUnreadCount(0);
    setShowModal(true);
  };

  const clearAll = async () => {
    setNotifQueue([]);
    setUnreadCount(0);
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  if (loading) return <LoadingView message="Carregando pets..." />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.userBox}
            onPress={() => navigation?.navigate('UserProfile', { userId, userName })}
          >
            {userPhotoUri
              ? <Image source={{ uri: userPhotoUri }} style={styles.userPhoto} />
              : <UserRound size={24} color="#2794AD" />
            }
          </TouchableOpacity>

          <Text style={styles.greeting}>{t.hello}, {userName}!</Text>

          <TouchableOpacity style={styles.bellBox} onPress={handleBellPress}>
            <Bell size={22} color="#2794AD" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t.home}</Text>

        <View style={styles.grid}>
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              style={styles.petCard}
              onPress={() => navigation?.navigate('PetProfile', { petId: pet.id, ownerId: userId })}
            >
              <View style={styles.petImagePlaceholder}>
                {petPhotos[pet.id]
                  ? <Image source={{ uri: petPhotos[pet.id] }} style={styles.petPhoto} />
                  : <Text style={styles.petImageEmoji}>{getPetEmoji(pet.species)}</Text>
                }
              </View>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petBreed}>{pet.species || ''}</Text>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation?.navigate('PetEdit', { petId: pet.id, ownerId: userId })}
              >
                <SquarePen size={18} color="#fff" />
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addCard}
            onPress={() => navigation?.navigate('PetEdit', { ownerId: userId })}
          >
            <View style={styles.addCircle}>
              <Plus size={44} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="home" userId={userId} userName={userName} />

      {/* ── Notification center modal ─────────────────────────────────── */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>

            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notificações</Text>
              <View style={styles.modalHeaderRight}>
                {notifQueue.length > 0 && (
                  <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
                    <Trash2 size={15} color="#DA524D" />
                    <Text style={styles.clearText}>Limpar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                  <X size={18} color="#5FAFC2" />
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            <ScrollView
              style={styles.notifList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {notifQueue.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Bell size={40} color="#B1DDE7" />
                  <Text style={styles.emptyText}>Nenhuma notificação ainda</Text>
                </View>
              ) : (
                notifQueue.map(item => <NotifCard key={item.id} item={item} />)
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DBE9EF' },
  content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userBox: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#F4F4F4',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  userPhoto: { width: 52, height: 52, borderRadius: 26 },
  greeting: {
    fontFamily: 'Kanit_400Regular', color: '#1E5968', fontSize: 22,
    flex: 1, textAlign: 'center',
  },
  bellBox: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: '#F4F4F4',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  badge: {
    position: 'absolute', top: 6, right: 6, backgroundColor: '#E4B651',
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  sectionTitle: {
    marginTop: 16, marginBottom: 16, textAlign: 'center',
    fontFamily: 'Kanit_700Bold', color: '#1E93AD', fontSize: 35,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14 },
  petCard: {
    width: '47%', borderRadius: 10, backgroundColor: '#F4F4F4', padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  petImagePlaceholder: {
    width: '100%', height: 74, borderRadius: 8, backgroundColor: '#E0F3F8',
    alignItems: 'center', justifyContent: 'center',
  },
  petImageEmoji: { fontSize: 36 },
  petPhoto: { width: '100%', height: '100%', borderRadius: 8 },
  petName: {
    marginTop: 8, marginBottom: 2, textAlign: 'center',
    color: '#1E5968', fontFamily: 'Kanit_700Bold', fontSize: 22,
  },
  petBreed: {
    textAlign: 'center', color: '#5FAFC2',
    fontFamily: 'Kanit_400Regular', fontSize: 12, marginBottom: 8,
  },
  editButton: {
    height: 36, borderRadius: 6, backgroundColor: '#E4B651',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  editText: { color: '#fff', fontFamily: 'Kanit_700Bold', fontSize: 18 },
  addCard: {
    width: '47%', minHeight: 160, borderRadius: 10,
    backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center',
  },
  addCircle: {
    width: 70, height: 70, borderRadius: 12, backgroundColor: '#1E93AD',
    alignItems: 'center', justifyContent: 'center',
  },
  // Modal sheet
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D0D0D0', marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  modalTitle: { fontFamily: 'Kanit_700Bold', color: '#1E5968', fontSize: 18 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#DA524D22',
    backgroundColor: '#FFF0EF',
  },
  clearText: { fontFamily: 'Kanit_400Regular', color: '#DA524D', fontSize: 12 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#F0F8FA', alignItems: 'center', justifyContent: 'center',
  },
  notifList: { flexGrow: 0 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: 'Kanit_400Regular', color: '#B1DDE7', fontSize: 15 },
});

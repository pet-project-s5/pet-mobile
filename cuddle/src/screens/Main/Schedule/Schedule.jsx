import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Modal, Pressable, Image,
} from 'react-native';
import { UserRound, Plus, Trash2, Calendar, AlertTriangle } from 'lucide-react-native';
import { getUserPhoto } from '../../../services/photoStorage';
import { useSettings, useT } from '../../../contexts/SettingsContext';
import BottomNav from '../../Elements/BottomNav';
import { getAppointmentsByUser, deleteAppointment } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const map = {
    PENDING: { label: 'Pendente', color: '#E4B651' },
    CONFIRMED: { label: 'Confirmado', color: '#2EC27E' },
    CANCELLED: { label: 'Cancelado', color: '#DA524D' },
    COMPLETED: { label: 'Concluído', color: '#2794AD' },
  };
  const s = map[status] || { label: status || 'Agendado', color: '#2794AD' };
  return (
    <View style={[styles.badge, { backgroundColor: s.color + '22' }]}>
      <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function Schedule({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const t = useT();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName || '';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ visible: false, apptId: null });
  const [cancelling, setCancelling] = useState(false);
  const [userPhotoUri, setUserPhotoUri] = useState(null);

  useFocusEffect(useCallback(() => { getUserPhoto(userId).then(setUserPhotoUri); }, [userId]));

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAppointmentsByUser(userId);
      setAppointments(data);
    } catch (error) {
      console.log('Erro ao carregar agendamentos:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleDelete = (apptId) => {
    setCancelModal({ visible: true, apptId });
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await deleteAppointment(cancelModal.apptId);
      setAppointments(prev => prev.filter(a => a.id !== cancelModal.apptId));
      setCancelModal({ visible: false, apptId: null });
    } catch {
      // keep modal open on error, just stop loading
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingView message="Carregando agendamentos..." />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* ── Cancel confirmation modal ─────────────────────────── */}
      <Modal visible={cancelModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={40} color="#DA524D" />
            </View>
            <Text style={styles.modalTitle}>Cancelar agendamento?</Text>
            <Text style={styles.modalMsg}>
              Esta ação não pode ser desfeita. Tem certeza que deseja cancelar?
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={styles.modalBtnNo}
                onPress={() => setCancelModal({ visible: false, apptId: null })}
                disabled={cancelling}
              >
                <Text style={styles.modalBtnNoText}>Manter</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtnYes, cancelling && { opacity: 0.6 }]}
                onPress={confirmCancel}
                disabled={cancelling}
              >
                <Text style={styles.modalBtnYesText}>
                  {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              ? <Image source={{ uri: userPhotoUri }} style={{ width: 42, height: 42, borderRadius: 21 }} />
              : <UserRound size={20} color="#2794AD" />
            }
          </TouchableOpacity>
          <Text style={styles.greeting}>
            {userName ? `Olá, ${userName}!` : 'Agendamentos'}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>{t.schedule}</Text>
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() =>
              navigation?.navigate('ScheduleCreate', { userId, userName })
            }
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.newBtnText}>Novo</Text>
          </TouchableOpacity>
        </View>

        {appointments.length === 0 ? (
          <View style={styles.empty}>
            <Calendar size={52} color="#B1DDE7" />
            <Text style={styles.emptyText}>Nenhum agendamento encontrado</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() =>
                navigation?.navigate('ScheduleCreate', { userId, userName })
              }
            >
              <Text style={styles.emptyBtnText}>Fazer meu primeiro agendamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.map((appt) => (
            <View key={appt.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <Text style={styles.petName}>{appt.pet?.name ?? '—'}</Text>
                  <Text style={styles.offeringName}>{appt.petOfferingNames ?? '—'}</Text>
                </View>
                <StatusBadge status={appt.status} />
              </View>

              <View style={styles.cardMid}>
                <Calendar size={13} color="#5FAFC2" />
                <Text style={styles.dateText}>{formatDateTime(appt.startDateTime)}</Text>
              </View>

              {appt.employee && (
                <Text style={styles.employeeText}>
                  Funcionário: {appt.employee.name}
                </Text>
              )}

              {appt.totalPrice != null && (
                <Text style={styles.priceText}>
                  Total: R$ {Number(appt.totalPrice).toFixed(2)}
                </Text>
              )}

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(appt.id)}
              >
                <Trash2 size={14} color="#DA524D" />
                <Text style={styles.deleteBtnText}>Cancelar agendamento</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="schedule" userId={userId} userName={userName} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DBE9EF' },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userBox: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greeting: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 22,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
    fontSize: 22,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E93AD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
  },
  card: {
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardLeft: { flex: 1 },
  petName: {
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
  },
  offeringName: {
    color: '#2794AD',
    fontFamily: 'Kanit_400Regular',
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Kanit_700Bold',
    fontSize: 11,
  },
  cardMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  dateText: {
    color: '#5FAFC2',
    fontFamily: 'Kanit_400Regular',
    fontSize: 13,
  },
  employeeText: {
    color: '#5FAFC2',
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
    marginBottom: 2,
  },
  priceText: {
    color: '#2EC27E',
    fontFamily: 'Kanit_700Bold',
    fontSize: 13,
    marginBottom: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  deleteBtnText: {
    color: '#DA524D',
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  modalIconWrap: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF0EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 18,
    textAlign: 'center',
  },
  modalMsg: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  modalBtnNo: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#B1DDE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnNoText: {
    fontFamily: 'Kanit_700Bold',
    color: '#5FAFC2',
    fontSize: 14,
  },
  modalBtnYes: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#DA524D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnYesText: {
    fontFamily: 'Kanit_700Bold',
    color: '#fff',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: '#B1DDE7',
    fontFamily: 'Kanit_400Regular',
    fontSize: 16,
  },
  emptyBtn: {
    backgroundColor: '#1E93AD',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
  },
});

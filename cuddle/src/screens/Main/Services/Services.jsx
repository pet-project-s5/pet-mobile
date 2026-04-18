import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { UserRound, Clock3, Scissors, RefreshCw } from 'lucide-react-native';
import { getUserPhoto } from '../../../services/photoStorage';
import { useSettings, useT } from '../../../contexts/SettingsContext';
import BottomNav from '../../Elements/BottomNav';
import { getServices } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

const SERVICE_COLORS = [
  '#1E93AD', '#E4B651', '#2EC27E', '#DA524D', '#8671FF',
  '#5FAFC2', '#E07B54', '#4CA8BF',
];

const SERVICE_KEYWORD_MAP = [
  { keys: ['banho'],                  emoji: '🛁', color: '#1E93AD' },
  { keys: ['tosa', 'corte'],          emoji: '✂️', color: '#5FAFC2' },
  { keys: ['unha', 'manicure'],       emoji: '💅', color: '#8671FF' },
  { keys: ['dent', 'dental', 'dente'],emoji: '🦷', color: '#E07B54' },
  { keys: ['vacinaç', 'vacin'],       emoji: '💉', color: '#2EC27E' },
  { keys: ['consult', 'veteri'],      emoji: '🩺', color: '#DA524D' },
  { keys: ['hosped', 'hotel'],        emoji: '🏠', color: '#E4B651' },
  { keys: ['passei', 'walker'],       emoji: '🦮', color: '#4CA8BF' },
  { keys: ['adest', 'treina'],        emoji: '🎓', color: '#8671FF' },
  { keys: ['emerg'],                  emoji: '🚨', color: '#DA524D' },
  { keys: ['nutriç', 'nutri'],        emoji: '🥩', color: '#2EC27E' },
];

function getServiceStyle(service, index) {
  const text = ((service.description || '') + ' ' + (service.name || '')).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const { keys, emoji, color } of SERVICE_KEYWORD_MAP) {
    if (keys.some(k => text.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return { emoji, color };
    }
  }
  return {
    emoji: '🐾',
    color: SERVICE_COLORS[index % SERVICE_COLORS.length],
  };
}

export default function Services({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme } = useSettings();
  const t = useT();
  const userId = route?.params?.userId;
  const userName = route?.params?.userName || '';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [userPhotoUri, setUserPhotoUri] = useState(null);

  useFocusEffect(useCallback(() => { getUserPhoto(userId).then(setUserPhotoUri); }, [userId]));

  const loadServices = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await getServices();
      setServices(data);
    } catch (error) {
      setErrorMsg(error.message || 'Não foi possível carregar os serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  if (loading) return <LoadingView message="Carregando serviços..." />;

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
              ? <Image source={{ uri: userPhotoUri }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              : <UserRound size={22} color="#2794AD" />
            }
          </TouchableOpacity>
          <Text style={styles.greeting}>
            {userName ? `Olá, ${userName}!` : 'Nossos Serviços'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t.services}</Text>

        <View style={styles.grid}>
          {services.map((service, index) => {
            const { emoji, color } = getServiceStyle(service, index);
            return (
              <View key={service.id} style={styles.serviceCard}>
                <View style={[styles.serviceIconWrap, { backgroundColor: color + '22' }]}>
                  <Text style={styles.serviceEmoji}>{emoji}</Text>
                </View>
                <Text style={styles.serviceName}>{service.description || service.name}</Text>
                {service.name ? (
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {service.name}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.bookButton, { backgroundColor: color }]}
                  onPress={() =>
                    navigation?.navigate('ScheduleCreate', {
                      userId,
                      userName,
                      preselectedServiceId: service.id,
                    })
                  }
                >
                  <Clock3 size={14} color="#fff" />
                  <Text style={styles.bookText}>Agendar</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {errorMsg ? (
          <View style={styles.empty}>
            <RefreshCw size={40} color="#DA524D" />
            <Text style={[styles.emptyText, { color: '#DA524D' }]}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadServices}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : services.length === 0 && (
          <View style={styles.empty}>
            <Scissors size={48} color="#B1DDE7" />
            <Text style={styles.emptyText}>Nenhum serviço disponível</Text>
          </View>
        )}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="services" userId={userId} userName={userName} />
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
    gap: 12,
    marginBottom: 12,
  },
  userBox: {
    width: 48, height: 48,
    borderRadius: 24,
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
  sectionTitle: {
    textAlign: 'center',
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
    fontSize: 22,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '47%',
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceIconWrap: {
    width: '100%',
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  serviceEmoji: { fontSize: 32 },
  serviceName: {
    textAlign: 'center',
    marginBottom: 4,
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
  },
  serviceDesc: {
    textAlign: 'center',
    color: '#5FAFC2',
    fontFamily: 'Kanit_400Regular',
    fontSize: 11,
    marginBottom: 8,
  },
  bookButton: {
    height: 32,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  bookText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 12,
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
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1E93AD',
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontFamily: 'Kanit_400Regular',
    fontSize: 14,
  },
});

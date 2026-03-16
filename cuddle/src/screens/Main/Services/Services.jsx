import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { UserRound, Clock3 } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getServices } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

export default function Services({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || 1;
  const userName = route?.params?.userName || 'Matheus';
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const data = await getServices();
        setServices(data);
      } catch (error) {
        console.log('Erro ao carregar servicos:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  if (loading) return <LoadingView message="Carregando serviços..." />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.userBox}>
            <UserRound size={22} color="#2794AD" />
          </View>
          <Text style={styles.greeting}>Olá, {userName}!</Text>
        </View>

        <Text style={styles.sectionTitle}>Nossos Servicos</Text>

        <View style={styles.grid}>
          {services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <Image source={{ uri: service.imagem }} style={styles.serviceImage} />
              <Text style={styles.serviceName}>{service.nome}</Text>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => navigation?.navigate('Schedule', { userId })}
              >
                <Clock3 size={14} color="#fff" />
                <Text style={styles.bookText}>Agendar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="services" userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#DBE9EF',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 24,
    lineHeight: 30,
    paddingTop: 2,
    textAlign: 'right',
    flexShrink: 1,
  },
  sectionTitle: {
    textAlign: 'center',
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
    fontSize: 19,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '47%',
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    padding: 6,
  },
  serviceImage: {
    width: '100%',
    height: 58,
    borderRadius: 6,
  },
  serviceName: {
    textAlign: 'center',
    marginVertical: 6,
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
  },
  bookButton: {
    height: 32,
    borderRadius: 5,
    backgroundColor: '#E4B651',
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
});

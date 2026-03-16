import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { UserRound, SquarePen } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getAppointmentsByUser, getPetsByUser } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

export default function Schedule({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || 1;
  const userName = route?.params?.userName || 'Matheus';
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [appointments, pets] = await Promise.all([
          getAppointmentsByUser(userId),
          getPetsByUser(userId),
        ]);

        const petsById = pets.reduce((acc, pet) => {
          acc[pet.id] = pet;
          return acc;
        }, {});

        const merged = appointments.map((appt) => ({
          ...appt,
          pet: petsById[appt.petId],
        }));

        setCards(merged);
      } catch (error) {
        console.log('Erro ao carregar agendamentos:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  if (loading) return <LoadingView message="Carregando agendamentos..." />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.userBox}>
            <UserRound size={20} color="#2794AD" />
          </View>
          <Text style={styles.greeting}>Olá, {userName}!</Text>
        </View>

        <Text style={styles.sectionTitle}>Agendamentos</Text>

        {cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <Image source={{ uri: card.pet?.foto }} style={styles.cardImage} />

            <View style={styles.cardRow}>
              <Text style={styles.cardTitle}>{card.titulo}</Text>
              <Text style={styles.cardDate}>{card.data}</Text>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation?.navigate('PetEdit', { petId: card.petId, userId })}
            >
              <SquarePen size={14} color="#fff" />
              <Text style={styles.editText}>Editar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="schedule" userId={userId} />
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
    width: 42,
    height: 42,
    borderRadius: 8,
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
    fontSize: 18,
    marginBottom: 12,
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    padding: 6,
    marginBottom: 12,
  },
  cardImage: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  cardTitle: {
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 15,
  },
  cardDate: {
    color: '#4CA8BF',
    fontFamily: 'Kanit_400Regular',
    fontSize: 13,
  },
  editButton: {
    height: 32,
    borderRadius: 5,
    backgroundColor: '#E4B651',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  editText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 13,
  },
});

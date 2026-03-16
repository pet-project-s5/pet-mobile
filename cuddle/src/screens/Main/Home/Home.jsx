import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { UserRound, SquarePen, Plus } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getPetsByUser } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

export default function Home({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || 1;
  const userName = route?.params?.userName || 'Matheus';
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPets() {
      try {
        setLoading(true);
        const data = await getPetsByUser(userId);
        setPets(data);
      } catch (error) {
        console.log('Erro ao carregar pets:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadPets();
  }, [userId]);

  if (loading) return <LoadingView message="Carregando pets..." />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.userBox}>
            <UserRound size={24} color="#2794AD" />
          </View>
          <Text style={styles.greeting}>Olá, {userName}!</Text>
        </View>

        <Text style={styles.sectionTitle}>Meus Pets</Text>

        <View style={styles.grid}>
          {pets.map((pet) => (
            <TouchableOpacity
              key={pet.id}
              style={styles.petCard}
              onPress={() => navigation?.navigate('PetProfile', { petId: pet.id, userId })}
            >
              <Image source={{ uri: pet.foto }} style={styles.petImage} />
              <Text style={styles.petName}>{pet.nome}</Text>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation?.navigate('PetEdit', { petId: pet.id, userId })}
              >
                <SquarePen size={18} color="#fff" />
                <Text style={styles.editText}>Editar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.addCard}
            onPress={() => navigation?.navigate('PetEdit', { userId })}
          >
            <View style={styles.addCircle}>
              <Plus size={44} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav navigation={navigation} activeTab="home" userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#DBE9EF',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
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
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Kanit_700Bold',
    color: '#1E93AD',
    fontSize: 35,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  petCard: {
    width: '47%',
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  petImage: {
    width: '100%',
    height: 74,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  petName: {
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 28,
  },
  editButton: {
    height: 36,
    borderRadius: 6,
    backgroundColor: '#E4B651',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 20,
  },
  addCard: {
    width: '47%',
    minHeight: 160,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#1E93AD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

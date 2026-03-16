import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { ChevronLeft, SquarePen, Plus } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getPetById } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function PetProfile({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || 1;
  const petId = route?.params?.petId || 1;
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPet() {
      try {
        setLoading(true);
        const data = await getPetById(petId);
        setPet(data);
      } catch (error) {
        console.log('Erro ao carregar pet:', error.message);
      } finally {
        setLoading(false);
      }
    }

    loadPet();
  }, [petId]);

  if (loading || !pet) return <LoadingView message="Carregando perfil do pet..." />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top - 6, 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topImageWrap}>
          <Image source={{ uri: pet.foto }} style={styles.petImage} />

          <TouchableOpacity
            style={[styles.topLeftBtn, { top: insets.top + 8 }]}
            onPress={() => navigation?.goBack()}
          >
            <ChevronLeft size={24} color="#2794AD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topRightBtn, { top: insets.top + 8 }]}
            onPress={() => navigation?.navigate('PetEdit', { petId, userId })}
          >
            <SquarePen size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.petName}>{pet.nome}</Text>
        <Text style={styles.petType}>{pet.tipo}</Text>

        <View style={styles.infoRow}>
          <InfoBox label="Sex" value={pet.sexo} />
          <InfoBox label="Age" value={pet.idade} />
          <InfoBox label="Weight" value={pet.peso} />
        </View>

        <Text style={styles.section}>Agendamentos</Text>

        <View style={styles.agendaRow}>
          <InfoBox label="Banho" value="10/03" />
          <InfoBox label="Corte" value="12/03" />
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation?.navigate('Services', { userId })}>
            <Plus size={20} color="#fff" />
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
    paddingBottom: 24,
  },
  topImageWrap: {
    position: 'relative',
  },
  petImage: {
    width: '100%',
    height: 240,
  },
  topLeftBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E4B651',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    marginTop: 10,
    marginHorizontal: 12,
    color: '#1E5968',
    fontSize: 33,
    fontFamily: 'Kanit_700Bold',
  },
  petType: {
    marginHorizontal: 12,
    color: '#5FAFC2',
    fontSize: 16,
    fontFamily: 'Kanit_400Regular',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 14,
    gap: 8,
  },
  infoBox: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#F1F1F1',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#B1DDE7',
    fontFamily: 'Kanit_400Regular',
    fontSize: 12,
  },
  infoValue: {
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
  },
  section: {
    marginHorizontal: 12,
    marginBottom: 8,
    color: '#1E5968',
    fontFamily: 'Kanit_400Regular',
    fontSize: 16,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 8,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#1E93AD',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

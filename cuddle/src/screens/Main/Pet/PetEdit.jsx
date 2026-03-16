import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, ScrollView } from 'react-native';
import { X, Check, Camera, Plus } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getPetById, updatePet } from '../../../services/api';
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

export default function PetEdit({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId || 1;
  const petId = route?.params?.petId || 1;
  const [pet, setPet] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPet() {
      try {
        setLoading(true);
        const data = await getPetById(petId);
        setPet(data);
        setName(data.nome);
      } catch (error) {
        console.log('Erro ao carregar pet:', error.message);
      } finally {
        setLoading(false);
      }
    }

    if (petId) loadPet();
  }, [petId]);

  if (loading || !pet) return <LoadingView message="Carregando edição do pet..." />;

  const handleSave = async () => {
    try {
      await updatePet(pet.id, { nome: name });
      navigation?.navigate('PetProfile', { petId: pet.id, userId });
    } catch (error) {
      console.log('Erro ao salvar pet:', error.message);
    }
  };

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
            <X size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.topRightBtn, { top: insets.top + 8 }]} onPress={handleSave}>
            <Check size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cameraBtn}>
            <Camera size={20} color="#1E93AD" />
          </TouchableOpacity>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.nameInput}
          placeholder="Nome do pet"
          placeholderTextColor="#5FAFC2"
        />

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
            <Plus size={20} color="#E4B651" />
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
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#DA524D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#2EC27E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    left: '50%',
    bottom: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    marginTop: 14,
    marginHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F1F1',
    paddingHorizontal: 10,
    height: 40,
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 31,
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
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

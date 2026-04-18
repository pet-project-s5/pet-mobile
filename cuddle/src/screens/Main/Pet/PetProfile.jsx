import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, Pressable } from 'react-native';
import { ChevronLeft, SquarePen, Plus, Camera } from 'lucide-react-native';
import { pickFromGallery, takePhoto as pickCamera } from '../../../services/photoPicker';
import BottomNav from '../../Elements/BottomNav';
import { getPetById } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';
import { getPetPhoto, savePetPhoto, deletePetPhoto } from '../../../services/photoStorage';
import ImageEditModal from '../../../components/common/ImageEditModal';

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

const SPECIES_EMOJI = {
  cachorro: '🐶',
  gato: '🐱',
  ave: '🦜',
  peixe: '🐟',
  hamster: '🐹',
};

function petEmoji(species = '') {
  const key = species.toLowerCase();
  return SPECIES_EMOJI[key] || '🐾';
}

export default function PetProfile({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ownerId = route?.params?.ownerId || route?.params?.userId;
  const petId = route?.params?.petId;
  const userName = route?.params?.userName;
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState(null);
  const [photoModal, setPhotoModal] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, rawUri: null });

  useEffect(() => {
    async function loadPet() {
      try {
        setLoading(true);
        const data = await getPetById(petId, ownerId);
        setPet(data);
      } catch (error) {
        console.log('Erro ao carregar pet:', error.message);
      } finally {
        setLoading(false);
      }
    }

    if (petId && ownerId) loadPet();
    getPetPhoto(petId).then(uri => setPhotoUri(uri));
  }, [petId, ownerId]);

  async function handleGallery() {
    setPhotoModal(false);
    const uri = await pickFromGallery();
    if (uri) setEditModal({ visible: true, rawUri: uri });
  }

  async function handleCamera() {
    setPhotoModal(false);
    const uri = await pickCamera();
    if (uri) setEditModal({ visible: true, rawUri: uri });
  }

  async function handleEditConfirm(processedUri) {
    setEditModal({ visible: false, rawUri: null });
    const saved = await savePetPhoto(petId, processedUri);
    setPhotoUri(saved);
  }

  async function removePhoto() {
    setPhotoModal(false);
    await deletePetPhoto(petId);
    setPhotoUri(null);
  }

  if (loading || !pet) return <LoadingView message="Carregando perfil do pet..." />;

  const sexLabel = pet.sex === 'M' || pet.sex?.toLowerCase() === 'macho' ? 'Macho' : 'Fêmea';

  return (
    <View style={styles.screen}>
      {/* Photo action modal */}
      <Modal visible={photoModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPhotoModal(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity style={styles.sheetOption} onPress={handleCamera}>
              <Text style={styles.sheetOptionText}>Tirar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={handleGallery}>
              <Text style={styles.sheetOptionText}>Escolher da galeria</Text>
            </TouchableOpacity>
            {photoUri && (
              <TouchableOpacity style={styles.sheetOption} onPress={removePhoto}>
                <Text style={[styles.sheetOptionText, { color: '#DA524D' }]}>Remover foto</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.sheetOption, { marginTop: 4 }]} onPress={() => setPhotoModal(false)}>
              <Text style={[styles.sheetOptionText, { color: '#B1DDE7' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top - 6, 0) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header visual com foto/emoji */}
        <View style={[styles.topImageWrap, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.emojiContainer} onPress={() => setPhotoModal(true)}>
            {photoUri
              ? <Image source={{ uri: photoUri }} style={styles.petPhoto} />
              : <Text style={styles.bigEmoji}>{petEmoji(pet.species)}</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraBtn} onPress={() => setPhotoModal(true)}>
            <Camera size={15} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topLeftBtn}
            onPress={() => navigation?.goBack()}
          >
            <ChevronLeft size={24} color="#2794AD" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topRightBtn}
            onPress={() =>
              navigation?.navigate('PetEdit', { petId, ownerId, userName })
            }
          >
            <SquarePen size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.petName}>{pet.name}</Text>
        <Text style={styles.petSpecies}>{pet.species} — {pet.breed}</Text>

        <View style={styles.infoRow}>
          <InfoBox label="Sexo" value={sexLabel} />
          <InfoBox label="Idade" value={pet.age != null ? `${pet.age} anos` : '—'} />
          <InfoBox label="Porte" value={pet.size} />
        </View>

        <View style={styles.infoRow}>
          <InfoBox label="Pelo" value={pet.coat} />
        </View>

        <Text style={styles.section}>Agendamentos</Text>

        <View style={styles.agendaRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() =>
              navigation?.navigate('ScheduleCreate', { petId, ownerId, userName })
            }
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addBtnText}>Agendar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav
        navigation={navigation}
        activeTab="home"
        userId={ownerId}
        userName={userName}
      />

      <ImageEditModal
        visible={editModal.visible}
        uri={editModal.rawUri}
        onConfirm={handleEditConfirm}
        onCancel={() => setEditModal({ visible: false, rawUri: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DBE9EF' },
  content: { paddingBottom: 24 },
  topImageWrap: {
    position: 'relative',
    height: 200,
    backgroundColor: '#E0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bigEmoji: { fontSize: 64 },
  petPhoto: { width: 110, height: 110, borderRadius: 55 },
  cameraBtn: {
    position: 'absolute',
    bottom: 40, right: '32%',
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: '#1E93AD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  // action sheet modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sheetOptionText: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 16,
    textAlign: 'center',
  },
  topLeftBtn: {
    position: 'absolute',
    top: 14, left: 14,
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightBtn: {
    position: 'absolute',
    top: 14, right: 14,
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: '#E4B651',
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    marginTop: 12,
    marginHorizontal: 16,
    color: '#1E5968',
    fontSize: 30,
    fontFamily: 'Kanit_700Bold',
  },
  petSpecies: {
    marginHorizontal: 16,
    color: '#5FAFC2',
    fontSize: 14,
    fontFamily: 'Kanit_400Regular',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  infoBox: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#F1F1F1',
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  infoLabel: {
    color: '#B1DDE7',
    fontFamily: 'Kanit_400Regular',
    fontSize: 11,
  },
  infoValue: {
    color: '#1E93AD',
    fontFamily: 'Kanit_700Bold',
    fontSize: 14,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    color: '#1E5968',
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
  },
  agendaRow: {
    marginHorizontal: 16,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E93AD',
    borderRadius: 8,
    height: 44,
  },
  addBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 15,
  },
});

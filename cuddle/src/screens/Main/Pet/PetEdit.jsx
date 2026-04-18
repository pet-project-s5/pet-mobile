import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, KeyboardAvoidingView,
  Platform, Modal, FlatList,
} from 'react-native';
import { X, Check, ChevronLeft, ChevronDown } from 'lucide-react-native';
import BottomNav from '../../Elements/BottomNav';
import { getPetById, createPet, updatePet } from '../../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingView from '../../Elements/LoadingView';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SIZE_OPTIONS = [
  { label: 'PP', value: 'pp' },
  { label: 'P',  value: 'p'  },
  { label: 'M',  value: 'm'  },
  { label: 'G',  value: 'g'  },
  { label: 'GG', value: 'gg' },
];

const COAT_OPTIONS = [
  { label: 'Pelo Curto', value: 'curta' },
  { label: 'Pelo Longo', value: 'longa' },
];

const SEX_OPTIONS = [
  { label: 'Macho', value: 'Macho' },
  { label: 'Fêmea', value: 'Fêmea' },
];

const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'Cachorro' },
  { label: 'Gato',     value: 'Gato'     },
  { label: 'Coelho',   value: 'Coelho'   },
  { label: 'Roedor',   value: 'Roedor'   },
  { label: 'Ave',      value: 'Ave'      },
  { label: 'Peixe',    value: 'Peixe'    },
  { label: 'Réptil',   value: 'Réptil'   },
  { label: 'Outro',    value: 'Outro'    },
];

// Species that have no fur — coat field hidden, value stored as 'curta'
const NO_FUR_SPECIES = ['Ave', 'Peixe', 'Réptil'];

const BREEDS_BY_SPECIES = {
  Cachorro: ['Labrador', 'Golden Retriever', 'Bulldog', 'Pastor Alemão', 'Poodle', 'Shih Tzu', 'Yorkshire', 'Beagle', 'Lhasa Apso', 'Dachshund', 'Rottweiler', 'Pinscher Miniatura', 'Border Collie', 'Husky Siberiano', 'SRD', 'Outro'],
  Gato:     ['Persa', 'Siamês', 'Maine Coon', 'Ragdoll', 'Bengal', 'British Shorthair', 'Sphynx', 'Angorá', 'SRD', 'Outro'],
  Ave:      ['Calopsita', 'Periquito', 'Papagaio', 'Canário', 'Agapornis', 'Cacatua', 'Outro'],
  Peixe:    ['Betta', 'Carpa', 'Guppy', 'Acará Bandeira', 'Neon Tetra', 'Outro'],
  Roedor:   ['Hamster Sírio', 'Hamster Anão', 'Porquinho da Índia', 'Chinchila', 'Gerbil', 'Outro'],
  Réptil:   ['Gecko Leopardo', 'Iguana', 'Jiboia', 'Tartaruga', 'Cágado', 'Outro'],
  Coelho:   ['Angorá', 'Holland Lop', 'Mini Rex', 'Leão', 'SRD', 'Outro'],
  Outro:    ['Outro'],
};

function getAvatarEmoji(species) {
  switch (species) {
    case 'Cachorro': return '🐶';
    case 'Gato':     return '🐱';
    case 'Ave':      return '🐦';
    case 'Peixe':    return '🐟';
    case 'Roedor':   return '🐹';
    case 'Réptil':   return '🦎';
    case 'Coelho':   return '🐰';
    default:         return '🐾';
  }
}

// ---------------------------------------------------------------------------
// Reusable components
// ---------------------------------------------------------------------------

function ChipGroup({ label, options, selected, onSelect }) {
  return (
    <View style={styles.chipGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, selected === opt.value && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
          >
            <Text style={[styles.chipText, selected === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Field({ label, placeholder, value, onChangeText, keyboardType = 'default', maxLength }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#B1DDE7"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
  );
}

function BreedPicker({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (breed) => {
    onSelect(breed);
    setOpen(false);
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TouchableOpacity style={styles.pickerBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={value ? styles.pickerBtnText : styles.pickerPlaceholder}>
          {value || 'Selecione a raça'}
        </Text>
        <ChevronDown size={18} color="#5FAFC2" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {options.map((breed) => (
                <TouchableOpacity
                  key={breed}
                  style={[styles.breedRow, value === breed && styles.breedRowSelected]}
                  onPress={() => handleSelect(breed)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.breedRowText, value === breed && styles.breedRowTextSelected]}>
                    {breed}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PetEdit({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ownerId  = route?.params?.ownerId || route?.params?.userId;
  const petId    = route?.params?.petId; // undefined = create mode
  const userName = route?.params?.userName;
  const isEditing = !!petId;

  const [loading, setLoading] = useState(isEditing);
  const [saving,  setSaving]  = useState(false);

  const [name,    setName]    = useState('');
  const [species, setSpecies] = useState('');
  const [breed,   setBreed]   = useState('');
  const [coat,    setCoat]    = useState('');
  const [age,     setAge]     = useState('');
  const [size,    setSize]    = useState('');
  const [sex,     setSex]     = useState('');

  // Derived
  const hasFur      = species ? !NO_FUR_SPECIES.includes(species) : true;
  const breedList   = species ? (BREEDS_BY_SPECIES[species] || ['Outro']) : [];

  // When species changes: reset breed and handle coat
  const handleSpeciesChange = (newSpecies) => {
    setSpecies(newSpecies);
    setBreed('');
    if (NO_FUR_SPECIES.includes(newSpecies)) {
      setCoat('curta'); // silently set default for no-fur species
    } else {
      setCoat('');
    }
  };

  useEffect(() => {
    if (!isEditing) return;
    async function loadPet() {
      try {
        const data = await getPetById(petId, ownerId);
        setName(data.name || '');
        setSpecies(data.species || '');
        setBreed(data.breed || '');
        setCoat(data.coat || '');
        setAge(data.age != null ? String(data.age) : '');
        setSize(data.size || '');
        setSex(data.sex || '');
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível carregar os dados do pet.');
      } finally {
        setLoading(false);
      }
    }
    loadPet();
  }, [petId, ownerId, isEditing]);

  if (loading) return <LoadingView message="Carregando pet..." />;

  const validate = () => {
    if (!name.trim())               return 'Informe o nome do pet.';
    if (!species)                   return 'Selecione a espécie.';
    if (!breed.trim())              return 'Selecione a raça.';
    if (hasFur && !coat)            return 'Selecione o tipo de pelo.';
    if (!age || isNaN(Number(age))) return 'Informe a idade (em anos).';
    if (!size)                      return 'Selecione o porte.';
    if (!sex)                       return 'Selecione o sexo.';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) { Alert.alert('Atenção', error); return; }

    const payload = {
      name:    name.trim(),
      species,
      breed:   breed.trim(),
      coat:    hasFur ? coat : 'curta',
      age:     Number(age),
      size,
      sex,
    };

    try {
      setSaving(true);
      if (isEditing) {
        await updatePet(petId, payload);
        navigation?.navigate('PetProfile', { petId, ownerId, userName });
      } else {
        await createPet(ownerId, payload);
        navigation?.replace('Home', { userId: ownerId, userName });
      }
    } catch (e) {
      Alert.alert('Erro', e.message || 'Não foi possível salvar o pet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation?.goBack()}>
              {isEditing
                ? <X size={22} color="#DA524D" />
                : <ChevronLeft size={22} color="#DA524D" />}
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Editar Pet' : 'Novo Pet'}
            </Text>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnGreen]}
              onPress={handleSave}
              disabled={saving}
            >
              <Check size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Emoji avatar */}
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarEmoji}>{getAvatarEmoji(species)}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field label="Nome" placeholder="Ex: Rex" value={name} onChangeText={setName} />

            {/* Species chip picker */}
            <ChipGroup
              label="Espécie"
              options={SPECIES_OPTIONS}
              selected={species}
              onSelect={handleSpeciesChange}
            />

            {/* Breed dropdown — only shown when a species is selected */}
            {species ? (
              <BreedPicker
                label="Raça"
                value={breed}
                options={breedList}
                onSelect={setBreed}
              />
            ) : null}

            <Field
              label="Idade (anos)"
              placeholder="Ex: 3"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              maxLength={2}
            />

            {/* Coat — only for species WITH fur */}
            {hasFur && (
              <ChipGroup label="Tipo de Pelo" options={COAT_OPTIONS} selected={coat} onSelect={setCoat} />
            )}

            <ChipGroup label="Porte"  options={SIZE_OPTIONS} selected={size} onSelect={setSize} />
            <ChipGroup label="Sexo"   options={SEX_OPTIONS}  selected={sex}  onSelect={setSex}  />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Pet'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav
        navigation={navigation}
        activeTab="home"
        userId={ownerId}
        userName={userName}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#DBE9EF' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 20,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  iconBtnGreen: { backgroundColor: '#2EC27E' },

  // Avatar
  avatarWrap:  { alignItems: 'center', marginBottom: 24 },
  avatarEmoji: { fontSize: 72 },

  // Form
  form: { gap: 4 },

  // Field (TextInput)
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 13,
    marginBottom: 4,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 46,
    paddingHorizontal: 14,
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  // Chip group
  chipGroup: { marginBottom: 14 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#B1DDE7',
  },
  chipActive: {
    backgroundColor: '#1E93AD',
    borderColor: '#1E93AD',
  },
  chipText: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 14,
  },
  chipTextActive: { color: '#fff' },

  // Breed picker button
  pickerBtn: {
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 46,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  pickerBtnText: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 15,
  },
  pickerPlaceholder: {
    fontFamily: 'Kanit_400Regular',
    color: '#B1DDE7',
    fontSize: 15,
  },

  // Breed picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxHeight: 420,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  modalTitle: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E5968',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  breedRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  breedRowSelected: {
    backgroundColor: '#E8F6FA',
  },
  breedRowText: {
    fontFamily: 'Kanit_400Regular',
    color: '#1E5968',
    fontSize: 15,
  },
  breedRowTextSelected: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E93AD',
  },

  // Save button
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#E4B651',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
  },
});

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  UserRound,
  Camera,
  Moon,
  Globe,
  LogOut,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings, useT } from '../../../contexts/SettingsContext';
import { saveUserPhoto, getUserPhoto, deleteUserPhoto } from '../../../services/photoStorage';
import { pickFromGallery, takePhoto as pickCamera } from '../../../services/photoPicker';
import { getOwnerById } from '../../../services/api';
import { clearAuth } from '../../../services/auth';
import ImageEditModal from '../../../components/common/ImageEditModal';

const LANG_OPTIONS = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default function UserProfile({ navigation, route }) {
  const { userId, userName } = route?.params ?? {};
  const insets = useSafeAreaInsets();
  const { darkMode, setDarkMode, language, setLanguage, theme } = useSettings();
  const t = useT();

  const [photoUri, setPhotoUri] = useState(null);
  const [photoModal, setPhotoModal] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, rawUri: null });
  const [langModal, setLangModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // ─── Load photo on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadPhoto() {
      const uri = await getUserPhoto(userId);
      setPhotoUri(uri);
    }
    loadPhoto();
  }, [userId]);

  // ─── Load user info on mount ───────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      setLoadingInfo(true);
      try {
        const data = await getOwnerById();
        setUserInfo({
          name: data?.name ?? userName ?? '',
          email: data?.email ?? '',
          cpf: data?.cpf ?? '',
          phoneNumber: data?.phoneNumber ?? '',
        });
      } catch (_) {
        // Endpoint not yet available — fall back to params
        setUserInfo({
          name: userName ?? '',
          email: '',
          cpf: '',
          phoneNumber: '',
        });
      } finally {
        setLoadingInfo(false);
      }
    }
    loadUser();
  }, [userId, userName]);

  // ─── Photo picking helpers ─────────────────────────────────────────────────
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
    const saved = await saveUserPhoto(userId, processedUri);
    setPhotoUri(saved);
  }

  async function removePhoto() {
    setPhotoModal(false);
    await deleteUserPhoto(userId);
    setPhotoUri(null);
  }

  // ─── Masked field helpers ──────────────────────────────────────────────────
  function maskCpf(cpf) {
    if (!cpf) return '—';
    const digits = cpf.replace(/\D/g, '');
    if (digits.length < 3) return cpf;
    return digits.slice(0, 3) + '.***.**-**';
  }

  function maskPhone(phone) {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 2) return phone;
    return digits.slice(0, 2) + ' *****-****';
  }

  const currentLangLabel =
    LANG_OPTIONS.find((o) => o.code === language)?.label ?? 'Português';

  const s = makeStyles(theme);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBtn}
          onPress={() => {
            if (navigation?.canGoBack()) {
              navigation.goBack();
            } else {
              navigation?.replace('Home', { userId, userName });
            }
          }}
        >
          <ChevronLeft size={26} color={theme.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.profile}</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile photo ──────────────────────────────────────────────── */}
        <View style={s.photoSection}>
          <TouchableOpacity
            style={s.photoCircleWrapper}
            onPress={() => setPhotoModal(true)}
            activeOpacity={0.85}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.photoCircle} />
            ) : (
              <View style={[s.photoCircle, s.photoPlaceholder]}>
                <UserRound size={56} color={theme.accent} />
              </View>
            )}

            {/* Camera badge */}
            <TouchableOpacity
              style={s.cameraBadge}
              onPress={() => setPhotoModal(true)}
              activeOpacity={0.85}
            >
              <Camera size={16} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>

          <Text style={s.photoName}>{userInfo?.name || userName || '—'}</Text>
          <Text style={s.photoEmail}>{userInfo?.email || ' '}</Text>
        </View>

        {/* ── User info card ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Informações</Text>

          <InfoRow
            label="Nome"
            value={loadingInfo ? null : userInfo?.name || '—'}
            theme={theme}
          />
          <InfoRow
            label="E-mail"
            value={loadingInfo ? null : userInfo?.email || '—'}
            theme={theme}
          />
          <InfoRow
            label="CPF"
            value={loadingInfo ? null : maskCpf(userInfo?.cpf)}
            theme={theme}
          />
          <InfoRow
            label="Telefone"
            value={loadingInfo ? null : maskPhone(userInfo?.phoneNumber)}
            theme={theme}
            last
          />
        </View>

        {/* ── Settings section ───────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>Configurações</Text>

        <View style={s.card}>
          {/* Dark mode row */}
          <View style={s.settingRow}>
            <View style={s.settingLeft}>
              <View style={s.settingIconBox}>
                <Moon size={18} color={theme.accent} />
              </View>
              <Text style={s.settingLabel}>{t.darkMode}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(val) => setDarkMode(val)}
              trackColor={{ false: theme.border ?? '#E8E8E8', true: theme.accent }}
              thumbColor="#fff"
            />
          </View>

          <View style={s.divider} />

          {/* Language row */}
          <Pressable
            style={s.settingRow}
            onPress={() => setLangModal(true)}
          >
            <View style={s.settingLeft}>
              <View style={s.settingIconBox}>
                <Globe size={18} color={theme.accent} />
              </View>
              <Text style={s.settingLabel}>{t.language}</Text>
            </View>
            <View style={s.langValueBox}>
              <Text style={s.langValueText}>{currentLangLabel}</Text>
              <ChevronLeft
                size={16}
                color={theme.textSub}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </View>
          </Pressable>
        </View>

        {/* ── Logout button ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.logoutBtn}
          activeOpacity={0.8}
          onPress={async () => { await clearAuth(); navigation?.replace('Login'); }}
        >
          <LogOut size={18} color="#DA524D" />
          <Text style={s.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Photo action sheet modal ────────────────────────────────────── */}
      <Modal
        visible={photoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModal(false)}
      >
        <Pressable style={s.sheetOverlay} onPress={() => setPhotoModal(false)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={s.sheetHandle} />

            <Text style={s.sheetTitle}>Foto de Perfil</Text>

            <TouchableOpacity style={s.sheetOption} onPress={handleCamera}>
              <Camera size={20} color={theme.accent} />
              <Text style={s.sheetOptionText}>Tirar foto</Text>
            </TouchableOpacity>

            <View style={s.sheetDivider} />

            <TouchableOpacity style={s.sheetOption} onPress={handleGallery}>
              <UserRound size={20} color={theme.accent} />
              <Text style={s.sheetOptionText}>Escolher da galeria</Text>
            </TouchableOpacity>

            {photoUri && (
              <>
                <View style={s.sheetDivider} />
                <TouchableOpacity style={s.sheetOption} onPress={removePhoto}>
                  <Text style={[s.sheetOptionText, { color: '#DA524D', marginLeft: 0 }]}>
                    Remover foto
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={s.sheetDivider} />

            <TouchableOpacity
              style={s.sheetOption}
              onPress={() => setPhotoModal(false)}
            >
              <Text style={[s.sheetOptionText, { color: theme.textSub, marginLeft: 0 }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Image editor modal ─────────────────────────────────────────── */}
      <ImageEditModal
        visible={editModal.visible}
        uri={editModal.rawUri}
        onConfirm={handleEditConfirm}
        onCancel={() => setEditModal({ visible: false, rawUri: null })}
      />

      {/* ── Language picker modal ───────────────────────────────────────── */}
      <Modal
        visible={langModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModal(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setLangModal(false)}>
          <Pressable style={s.langModal} onPress={() => {}}>
            <Text style={s.langModalTitle}>Selecionar idioma</Text>

            {LANG_OPTIONS.map((opt, i) => (
              <View key={opt.code}>
                {i > 0 && <View style={s.sheetDivider} />}
                <TouchableOpacity
                  style={s.langOption}
                  onPress={() => {
                    setLanguage(opt.code);
                    setLangModal(false);
                  }}
                >
                  <Text
                    style={[
                      s.langOptionText,
                      language === opt.code && s.langOptionActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {language === opt.code && (
                    <View style={s.langCheckDot} />
                  )}
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[s.langCancelBtn]}
              onPress={() => setLangModal(false)}
            >
              <Text style={s.langCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── InfoRow sub-component ────────────────────────────────────────────────────
function InfoRow({ label, value, theme, last }) {
  const s = makeStyles(theme);
  return (
    <>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>{label}</Text>
        {value === null ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Text style={s.infoValue}>{value}</Text>
        )}
      </View>
      {!last && <View style={s.divider} />}
    </>
  );
}

// ─── Styles factory ───────────────────────────────────────────────────────────
function makeStyles(theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.bg,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 3,
      elevation: 2,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Kanit_700Bold',
      fontSize: 20,
      color: theme.text,
    },
    headerSpacer: {
      width: 40,
    },

    // Content
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    // Photo section
    photoSection: {
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 8,
    },
    photoCircleWrapper: {
      width: 120,
      height: 120,
      marginBottom: 14,
    },
    photoCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#E0F3F8',
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#1E93AD',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    photoName: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 22,
      color: theme.text,
      marginBottom: 2,
    },
    photoEmail: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 14,
      color: theme.textSub,
    },

    // Card
    card: {
      backgroundColor: theme.cardAlt,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 6,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 3,
    },
    cardTitle: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 13,
      color: theme.textSub,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingTop: 12,
      paddingBottom: 8,
    },

    // Info rows
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    infoLabel: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 15,
      color: theme.textSub,
    },
    infoValue: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 15,
      color: theme.text,
      maxWidth: '65%',
      textAlign: 'right',
    },

    // Section title
    sectionTitle: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 16,
      color: theme.text,
      marginBottom: 10,
      marginLeft: 2,
    },

    // Settings rows
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingIconBox: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingLabel: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 15,
      color: theme.text,
    },
    langValueBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    langValueText: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 14,
      color: theme.textSub,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: theme.border ?? '#E8E8E8',
      marginHorizontal: -18,
    },

    // Logout
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: '#DA524D',
      borderRadius: 12,
      height: 50,
      marginTop: 4,
    },
    logoutText: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 16,
      color: '#DA524D',
    },

    // Photo action sheet
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.cardAlt,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.textSub,
      opacity: 0.4,
      marginBottom: 16,
    },
    sheetTitle: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 16,
      color: theme.text,
      marginBottom: 8,
    },
    sheetOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      gap: 12,
    },
    sheetOptionText: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 16,
      color: theme.text,
    },
    sheetDivider: {
      height: 1,
      backgroundColor: theme.border ?? '#E8E8E8',
    },

    // Language modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    langModal: {
      backgroundColor: theme.cardAlt,
      borderRadius: 18,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 8,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 8,
    },
    langModalTitle: {
      fontFamily: 'Kanit_700Bold',
      fontSize: 17,
      color: theme.text,
      marginBottom: 12,
    },
    langOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
    },
    langOptionText: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 16,
      color: theme.text,
    },
    langOptionActive: {
      fontFamily: 'Kanit_700Bold',
      color: '#1E93AD',
    },
    langCheckDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#1E93AD',
    },
    langCancelBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    langCancelText: {
      fontFamily: 'Kanit_400Regular',
      fontSize: 15,
      color: theme.textSub,
    },
  });
}

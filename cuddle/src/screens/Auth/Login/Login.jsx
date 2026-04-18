import { useState } from 'react';
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import { Mail, Lock } from 'lucide-react-native';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { login as loginRequest } from '../../../services/api';
import { setAuth } from '../../../services/auth';

export default function Login({ navigation }) {
  const [fontsLoaded] = useFonts({ Kanit_400Regular, KronaOne_400Regular });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  if (!fontsLoaded) return null;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha.');
      return;
    }

    try {
      setLoading(true);
      // Backend returns: { id, name, email, token, isAdmin }
      const data = await loginRequest(email.trim(), password);

      if (!data || !data.token) {
        Alert.alert('Login inválido', 'Email ou senha incorretos.');
        return;
      }

      await setAuth(data.token, data.id, data.name);

      navigation?.replace('Home', {
        userId: data.id,
        userName: data.name,
      });
    } catch (error) {
      if (error.status === 400 || error.status === 401 || error.status === 404) {
        setErrorModal({
          visible: true,
          title: 'Usuário não encontrado',
          message: 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
        });
      } else {
        setErrorModal({
          visible: true,
          title: 'Erro de conexão',
          message: 'Não foi possível conectar ao servidor. Verifique se o backend está rodando e se o dispositivo está na mesma rede.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Modal de erro ── */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ ...errorModal, visible: false })}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setErrorModal({ ...errorModal, visible: false })}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <AlertCircle size={48} color="#DA524D" />
            </View>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setErrorModal({ ...errorModal, visible: false })}
            >
              <Text style={styles.modalBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Image
        source={require('../../../assets/icons/frameBackground.png')}
        style={styles.background}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <Image source={require('../../../assets/icons/Logo.png')} style={styles.logoImage} />
            <View style={styles.logoTextCol}>
              <Text style={styles.logoText}>Cuddle</Text>
              <Text style={styles.slogan}>cuidar é amar</Text>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <Mail color="#77C9DB" size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#77C9DB"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color="#77C9DB" size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#77C9DB"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity onPress={() => {}}>
            <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Não tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
              <Text style={styles.registerLink}> Cadastre-se</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F7FB' },
  background: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    resizeMode: 'cover',
  },
  kav: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 50,
  },
  logoImage: { width: 48, height: 48, resizeMode: 'contain' },
  logoTextCol: { flexDirection: 'column' },
  logoText: {
    fontSize: 32,
    fontFamily: 'KronaOne_400Regular',
    color: '#2794AD',
    lineHeight: 36,
  },
  slogan: {
    fontSize: 13,
    fontFamily: 'KronaOne_400Regular',
    color: '#8DD6E6',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#8671FF',
    fontFamily: 'Kanit_400Regular',
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#E4B551',
    fontSize: 13,
    marginBottom: 24,
    fontFamily: 'Kanit_400Regular',
  },
  button: {
    height: 52,
    backgroundColor: '#E4B651',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Kanit_400Regular',
  },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { color: '#2794AD', fontSize: 14, fontFamily: 'Kanit_400Regular' },
  registerLink: { color: '#E4B651', fontSize: 14, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28,
    width: '100%', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FDE8E8', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'KronaOne_400Regular', color: '#1E5968',
    fontSize: 18, marginBottom: 10, textAlign: 'center',
  },
  modalMessage: {
    fontFamily: 'Kanit_400Regular', color: '#9BB8C1',
    fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  modalBtn: {
    width: '100%', height: 52, backgroundColor: '#E4B651',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  modalBtnText: { color: '#fff', fontFamily: 'Kanit_400Regular', fontSize: 16, fontWeight: '700' },
});

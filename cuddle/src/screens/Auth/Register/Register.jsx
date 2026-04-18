import { useState } from 'react';
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import Stepper from '../../Elements/Stepper';
import Logo from '../../Elements/Logo';
import {
  FolderPen, FileText, Phone, MapPin,
  Hash, Map, Mail, Lock, Eye, EyeOff, ChevronLeft, Building2,
} from 'lucide-react-native';
import {
  View, Text, Image, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, Pressable,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { register as registerRequest, login as loginRequest } from '../../../services/api';
import { setAuth } from '../../../services/auth';

// ─── Masks ────────────────────────────────────────────────────────────────────
function maskCPF(digits) {
  // 000.000.000-00
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function maskPhone(digits) {
  // (00) 00000-0000
  const d = digits.slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function maskCEP(digits) {
  // 00000-000
  const d = digits.slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0,5)}-${d.slice(5)}`;
}

// ─── CPF validation ───────────────────────────────────────────────────────────
function isValidCPF(raw) {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}

export default function Register({ navigation }) {
  const [currentStep, setCurrentStep] = useState(0);

  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successModal, setSuccessModal] = useState({ visible: false, name: '', userId: null });

  const [fontsLoaded] = useFonts({ Kanit_400Regular, KronaOne_400Regular });
  if (!fontsLoaded) return null;

  const setFieldError = (field, msg) =>
    setErrors((prev) => ({ ...prev, [field]: msg }));
  const clearError = (field) =>
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });

  // ── ViaCEP ────────────────────────────────────────────────────────────────
  const handleCepChange = async (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 8); // sempre extrai só dígitos
    setCep(digits);
    clearError('cep');

    if (digits.length === 8) {
      try {
        setCepLoading(true);
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setFieldError('cep', 'CEP não encontrado.');
        } else {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setComplement(data.complemento || '');
        }
      } catch {
        setFieldError('cep', 'Não foi possível buscar o CEP.');
      } finally {
        setCepLoading(false);
      }
    }
  };

  // ── Validação por step ────────────────────────────────────────────────────
  const validateStep = () => {
    const e = {};

    if (currentStep === 0) {
      if (!name.trim()) e.name = 'Nome é obrigatório.';
      else if (name.trim().length < 3) e.name = 'Nome deve ter pelo menos 3 caracteres.';
      else if (name.trim().length > 100) e.name = 'Nome deve ter no máximo 100 caracteres.';

      const cpfRaw = cpf.replace(/\D/g, '');
      if (!cpfRaw) e.cpf = 'CPF é obrigatório.';
      else if (cpfRaw.length !== 11) e.cpf = 'CPF deve ter exatamente 11 dígitos.';
      else if (!isValidCPF(cpfRaw)) e.cpf = 'CPF inválido. Verifique os dígitos.';

      const phone = phoneNumber.replace(/\D/g, '');
      if (!phone) e.phoneNumber = 'Telefone é obrigatório.';
      else if (phone.length !== 11) e.phoneNumber = 'Telefone deve ter 11 dígitos com DDD (ex: 11999998888).';
    }

    if (currentStep === 1) {
      const cepRaw = cep.replace(/\D/g, '');
      if (!cepRaw) e.cep = 'CEP é obrigatório.';
      else if (cepRaw.length !== 8) e.cep = 'CEP deve ter exatamente 8 dígitos.';

      if (!street.trim()) e.street = 'Rua é obrigatória.';
      else if (street.trim().length > 100) e.street = 'Rua deve ter no máximo 100 caracteres.';

      if (!number.trim()) e.number = 'Número é obrigatório.';
      else if (number.trim().length > 10) e.number = 'Número deve ter no máximo 10 caracteres.';

      if (!neighborhood.trim()) e.neighborhood = 'Bairro é obrigatório.';
      else if (neighborhood.trim().length > 100) e.neighborhood = 'Bairro deve ter no máximo 100 caracteres.';

      if (complement.trim().length > 100) e.complement = 'Complemento deve ter no máximo 100 caracteres.';
    }

    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) e.email = 'E-mail é obrigatório.';
      else if (!emailRegex.test(email.trim())) e.email = 'Formato de e-mail inválido.';
      else if (email.trim().length > 100) e.email = 'E-mail deve ter no máximo 100 caracteres.';

      if (!confirmEmail.trim()) e.confirmEmail = 'Confirme o e-mail.';
      else if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase())
        e.confirmEmail = 'Os e-mails não coincidem.';

      if (!password) e.password = 'Senha é obrigatória.';
      else if (password.length < 6) e.password = 'Senha deve ter pelo menos 6 caracteres.';
      else if (password.length > 255) e.password = 'Senha deve ter no máximo 255 caracteres.';

      if (!confirmPassword) e.confirmPassword = 'Confirme a senha.';
      else if (password !== confirmPassword) e.confirmPassword = 'As senhas não coincidem.';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmitRegister = async () => {
    const payload = {
      name: name.trim(),
      cpf: cpf.replace(/\D/g, ''),
      phoneNumber: phoneNumber.replace(/\D/g, ''),
      email: email.trim().toLowerCase(),
      password,
      cep: cep.replace(/\D/g, ''),
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      complement: complement.trim() || undefined,
    };
    try {
      setLoading(true);
      setSubmitted(true);
      await registerRequest(payload);
      const data = await loginRequest(payload.email, payload.password);
      if (!data?.token) throw new Error('Login automático falhou.');
      setAuth(data.token, data.id, data.name);
      setSuccessModal({ visible: true, name: data.name, userId: data.id });
    } catch (error) {
      setSubmitted(false);
      if (error.status === 409) {
        Alert.alert('Conta já existente', 'Este e-mail ou CPF já está cadastrado. Tente fazer login.');
      } else {
        Alert.alert('Erro', error.message || 'Não foi possível concluir o cadastro.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    if (!validateStep()) return;
    if (currentStep < 2) setCurrentStep(currentStep + 1);
    else handleSubmitRegister();
  };

  // ── Input helpers ─────────────────────────────────────────────────────────
  const ic = '#77C9DB';
  const is = 18;

  const inputRow = (hasError) => [styles.inputWrapper, hasError && styles.inputError];

  const handleEnterApp = () => {
    setSuccessModal({ visible: false, name: '', userId: null });
    navigation?.replace('Home', { userId: successModal.userId, userName: successModal.name });
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── Modal de conta criada ── */}
      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={handleEnterApp}
      >
        <Pressable style={styles.modalOverlay} onPress={handleEnterApp}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <CheckCircle size={56} color="#2EC27E" />
            </View>

            <Text style={styles.modalTitle}>Conta criada!</Text>
            <Text style={styles.modalSubtitle}>
              Bem-vindo(a) ao Cuddle,{'\n'}
              <Text style={styles.modalName}>{successModal.name}</Text> 🐾
            </Text>
            <Text style={styles.modalHint}>
              Seu cadastro foi concluído com sucesso. Agora você pode agendar serviços e cuidar do seu pet com amor.
            </Text>

            <TouchableOpacity style={styles.modalBtn} onPress={handleEnterApp}>
              <Text style={styles.modalBtnText}>Entrar no app</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Image
        source={require('../../../assets/icons/frameBackground.png')}
        style={styles.background}
        pointerEvents="none"
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
                <ChevronLeft color="#2794AD" size={28} />
              </TouchableOpacity>
              <Logo small />
            </View>

            <Stepper currentStep={currentStep} />

            {/* ── STEP 0 ── */}
            {currentStep === 0 && (
              <View style={styles.stepCard}>
                <Text style={styles.title}>Dados Pessoais</Text>

                <View style={inputRow(errors.name)}>
                  <FolderPen color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome completo"
                    placeholderTextColor={ic}
                    value={name}
                    onChangeText={(v) => { setName(v); clearError('name'); }}
                  />
                </View>
                {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

                <View style={inputRow(errors.cpf)}>
                  <FileText color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="000.000.000-00"
                    placeholderTextColor={ic}
                    keyboardType="numeric"
                    value={maskCPF(cpf)}
                    onChangeText={(v) => { setCpf(v.replace(/\D/g, '').slice(0, 11)); clearError('cpf'); }}
                  />
                </View>
                {errors.cpf ? <Text style={styles.err}>{errors.cpf}</Text> : null}

                <View style={inputRow(errors.phoneNumber)}>
                  <Phone color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor={ic}
                    keyboardType="numeric"
                    value={maskPhone(phoneNumber)}
                    onChangeText={(v) => { setPhoneNumber(v.replace(/\D/g, '').slice(0, 11)); clearError('phoneNumber'); }}
                  />
                </View>
                {errors.phoneNumber ? <Text style={styles.err}>{errors.phoneNumber}</Text> : null}
              </View>
            )}

            {/* ── STEP 1 ── */}
            {currentStep === 1 && (
              <View style={styles.stepCard}>
                <Text style={styles.title}>Endereço</Text>

                <View style={inputRow(errors.cep)}>
                  <MapPin color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="00000-000"
                    placeholderTextColor={ic}
                    keyboardType="numeric"
                    value={maskCEP(cep)}
                    onChangeText={handleCepChange}
                  />
                  {cepLoading && <ActivityIndicator size="small" color="#2794AD" />}
                </View>
                {errors.cep ? <Text style={styles.err}>{errors.cep}</Text> : null}

                <View style={inputRow(errors.street)}>
                  <Map color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Rua"
                    placeholderTextColor={ic}
                    value={street}
                    onChangeText={(v) => { setStreet(v); clearError('street'); }}
                  />
                </View>
                {errors.street ? <Text style={styles.err}>{errors.street}</Text> : null}

                <View style={inputRow(errors.number)}>
                  <Hash color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Número da residência"
                    placeholderTextColor={ic}
                    keyboardType="numeric"
                    maxLength={10}
                    value={number}
                    onChangeText={(v) => { setNumber(v); clearError('number'); }}
                  />
                </View>
                {errors.number ? <Text style={styles.err}>{errors.number}</Text> : null}

                <View style={inputRow(errors.neighborhood)}>
                  <Building2 color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Bairro"
                    placeholderTextColor={ic}
                    value={neighborhood}
                    onChangeText={(v) => { setNeighborhood(v); clearError('neighborhood'); }}
                  />
                </View>
                {errors.neighborhood ? <Text style={styles.err}>{errors.neighborhood}</Text> : null}

                <View style={inputRow(errors.complement)}>
                  <MapPin color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Complemento (opcional)"
                    placeholderTextColor={ic}
                    value={complement}
                    onChangeText={(v) => { setComplement(v); clearError('complement'); }}
                  />
                </View>
                {errors.complement ? <Text style={styles.err}>{errors.complement}</Text> : null}
              </View>
            )}

            {/* ── STEP 2 ── */}
            {currentStep === 2 && (
              <View style={styles.stepCard}>
                <Text style={styles.title}>Dados de Acesso</Text>

                <View style={inputRow(errors.email)}>
                  <Mail color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="E-mail"
                    placeholderTextColor={ic}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError('email'); }}
                  />
                </View>
                {errors.email ? <Text style={styles.err}>{errors.email}</Text> : null}

                <View style={inputRow(errors.confirmEmail)}>
                  <Mail color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar E-mail"
                    placeholderTextColor={ic}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={confirmEmail}
                    onChangeText={(v) => { setConfirmEmail(v); clearError('confirmEmail'); }}
                  />
                </View>
                {errors.confirmEmail ? <Text style={styles.err}>{errors.confirmEmail}</Text> : null}

                <View style={inputRow(errors.password)}>
                  <Lock color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    placeholderTextColor={ic}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError('password'); }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff color={ic} size={is} /> : <Eye color={ic} size={is} />}
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.err}>{errors.password}</Text> : null}

                <View style={inputRow(errors.confirmPassword)}>
                  <Lock color={ic} size={is} style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar Senha"
                    placeholderTextColor={ic}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); clearError('confirmPassword'); }}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff color={ic} size={is} /> : <Eye color={ic} size={is} />}
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.err}>{errors.confirmPassword}</Text> : null}
              </View>
            )}

            {/* ── Botões ── */}
            <View style={styles.actionsWrapper}>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleContinuar} disabled={loading || submitted}>
                <Text style={styles.buttonPrimaryText}>
                  {loading ? 'Salvando...' : currentStep < 2 ? 'Continuar' : 'Cadastrar'}
                </Text>
              </TouchableOpacity>

              {currentStep > 0 && (
                <TouchableOpacity style={styles.buttonOutline} onPress={() => setCurrentStep(currentStep - 1)}>
                  <Text style={styles.buttonOutlineText}>Voltar</Text>
                </TouchableOpacity>
              )}

              {currentStep === 0 && (
                <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation?.navigate('Login')}>
                  <Text style={styles.buttonSecondaryText}>Já tenho uma conta</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  background: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%',
    resizeMode: 'cover', backgroundColor: '#E8F7FB',
  },
  container: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 60, paddingBottom: 40,
  },
  backButton: {
    padding: 8, borderRadius: 8, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 16, marginBottom: 16,
  },
  stepCard: {
    width: '80%', marginTop: 24,
  },
  title: {
    fontFamily: 'KronaOne_400Regular', color: '#2794AD',
    fontSize: 20, marginBottom: 24, textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', height: 50,
    borderRadius: 8, paddingHorizontal: 16,
    marginBottom: 4,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  inputError: {
    borderColor: '#DA524D',
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1, height: 50,
    fontFamily: 'Kanit_400Regular', color: '#8671FF', fontSize: 15,
  },
  err: {
    color: '#DA524D',
    fontFamily: 'Kanit_400Regular',
    fontSize: 11,
    marginBottom: 10,
    marginLeft: 4,
  },
  actionsWrapper: { width: '80%', marginTop: 28, alignItems: 'center' },
  buttonPrimary: {
    width: '100%', height: 52, backgroundColor: '#E4B651',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  buttonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Kanit_400Regular' },
  buttonSecondary: {
    width: '100%', height: 52, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2794AD',
    justifyContent: 'center', alignItems: 'center',
  },
  buttonSecondaryText: { color: '#2794AD', fontSize: 15, fontFamily: 'Kanit_400Regular' },
  buttonOutline: {
    width: '100%', height: 52, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  buttonOutlineText: { color: '#E4B651', fontSize: 15, fontFamily: 'Kanit_400Regular' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 90, height: 90,
    borderRadius: 45,
    backgroundColor: '#E8FAF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'KronaOne_400Regular',
    color: '#1E5968',
    fontSize: 22,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontFamily: 'Kanit_400Regular',
    color: '#5FAFC2',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalName: {
    fontFamily: 'Kanit_700Bold',
    color: '#1E93AD',
  },
  modalHint: {
    fontFamily: 'Kanit_400Regular',
    color: '#9BB8C1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#E4B651',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontFamily: 'Kanit_700Bold',
    fontSize: 16,
  },
});

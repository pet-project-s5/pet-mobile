import { useState } from "react";
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import Stepper from "../../Elements/Stepper";
import Logo from "../../Elements/Logo";
import {
  FolderPen,
  CalendarDays,
  FileText,
  MapPin,
  Hash,
  Map,
  Building2,
  Flag,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
} from 'lucide-react-native';
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
} from 'react-native';
import { register as registerRequest } from '../../../services/api';

export default function Register({ navigation }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Step 0
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [cpf, setCpf] = useState('');

  // Step 1
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Step 2
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    KronaOne_400Regular,
  });

  if (!fontsLoaded) return null;

  const handleSubmitRegister = async () => {
    if (!nome || !email || !senha || !confirmSenha) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios para continuar.');
      return;
    }

    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      Alert.alert('Atenção', 'Os emails não são iguais.');
      return;
    }

    if (senha !== confirmSenha) {
      Alert.alert('Atenção', 'As senhas não são iguais.');
      return;
    }

    const payload = {
      nome,
      sobrenome,
      nascimento,
      cpf,
      cep,
      rua,
      numero,
      bairro,
      cidade,
      estado,
      email: email.trim().toLowerCase(),
      password: senha,
    };

    try {
      setLoading(true);
      const user = await registerRequest(payload);

      Alert.alert('Cadastro concluído', 'Conta criada com sucesso.', [
        {
          text: 'OK',
          onPress: () =>
            navigation?.replace('Home', {
              userId: user.id,
              userName: user.nome,
            }),
        },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleSubmitRegister();
  };

  const handleVoltarStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require('../../../assets/icons/frameBackground.png')}
        style={styles.background}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation?.goBack()}
            >
              <ChevronLeft color="#2794AD" size={28} />
            </TouchableOpacity>

            <Logo small />
          </View>

          <Stepper currentStep={currentStep} />

          {/* ── STEP 0: Dados Pessoais ── */}
          {currentStep === 0 && (
            <View style={styles.stepCard}>
              <Text style={styles.title}>Dados Pessoais</Text>

              <View style={styles.inputWrapper}>
                <FolderPen color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#77C9DB" value={nome} onChangeText={setNome} />
              </View>

              <View style={styles.inputWrapper}>
                <FolderPen color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Sobrenome" placeholderTextColor="#77C9DB" value={sobrenome} onChangeText={setSobrenome} />
              </View>

              <View style={styles.inputWrapper}>
                <CalendarDays color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Nascimento (DD/MM/AAAA)" placeholderTextColor="#77C9DB" keyboardType="numeric" value={nascimento} onChangeText={setNascimento} />
              </View>

              <View style={styles.inputWrapper}>
                <FileText color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="CPF" placeholderTextColor="#77C9DB" keyboardType="numeric" value={cpf} onChangeText={setCpf} />
              </View>
            </View>
          )}

          {/* ── STEP 1: Endereço ── */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <Text style={styles.title}>Endereço</Text>

              <View style={styles.inputWrapper}>
                <MapPin color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="CEP" placeholderTextColor="#77C9DB" keyboardType="numeric" value={cep} onChangeText={setCep} />
              </View>

              <View style={styles.inputWrapper}>
                <MapPin color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Rua" placeholderTextColor="#77C9DB" value={rua} onChangeText={setRua} />
              </View>

              <View style={styles.inputWrapper}>
                <Hash color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Número" placeholderTextColor="#77C9DB" keyboardType="numeric" value={numero} onChangeText={setNumero} />
              </View>

              <View style={styles.inputWrapper}>
                <Map color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Bairro" placeholderTextColor="#77C9DB" value={bairro} onChangeText={setBairro} />
              </View>

              <View style={styles.inputWrapper}>
                <Building2 color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Cidade" placeholderTextColor="#77C9DB" value={cidade} onChangeText={setCidade} />
              </View>

              <View style={styles.inputWrapper}>
                <Flag color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Estado (UF)" placeholderTextColor="#77C9DB" autoCapitalize="characters" maxLength={2} value={estado} onChangeText={setEstado} />
              </View>
            </View>
          )}

          {/* ── STEP 2: Dados de Entrada ── */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <Text style={styles.title}>Dados de Acesso</Text>

              <View style={styles.inputWrapper}>
                <Mail color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#77C9DB" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>

              <View style={styles.inputWrapper}>
                <Mail color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Confirmar Email" placeholderTextColor="#77C9DB" keyboardType="email-address" autoCapitalize="none" value={confirmEmail} onChangeText={setConfirmEmail} />
              </View>

              <View style={styles.inputWrapper}>
                <Lock color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#77C9DB" secureTextEntry={!showSenha} value={senha} onChangeText={setSenha} />
                <TouchableOpacity onPress={() => setShowSenha(!showSenha)}>
                  {showSenha ? <EyeOff color="#77C9DB" size={18} /> : <Eye color="#77C9DB" size={18} />}
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <Lock color="#77C9DB" size={18} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Confirmar Senha" placeholderTextColor="#77C9DB" secureTextEntry={!showConfirmSenha} value={confirmSenha} onChangeText={setConfirmSenha} />
                <TouchableOpacity onPress={() => setShowConfirmSenha(!showConfirmSenha)}>
                  {showConfirmSenha ? <EyeOff color="#77C9DB" size={18} /> : <Eye color="#77C9DB" size={18} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Botões ── */}
          <View style={styles.actionsWrapper}>
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleContinuar}
            >
              <Text style={styles.buttonPrimaryText}>
                {loading ? 'Salvando...' : currentStep < 2 ? 'Continuar' : 'Cadastrar'}
              </Text>
            </TouchableOpacity>

            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.buttonOutline}
                onPress={handleVoltarStep}
              >
                <Text style={styles.buttonOutlineText}>Voltar</Text>
              </TouchableOpacity>
            )}

            {currentStep === 0 && (
              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => navigation?.navigate('Login')}
              >
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
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#E8F7FB',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: 24,
  },
  title: {
    fontFamily: 'KronaOne_400Regular',
    color: '#2794AD',
    fontSize: 20,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '80%',
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: 'Kanit_400Regular',
    color: '#8671FF',
    fontSize: 15,
  },
  actionsWrapper: {
    width: '80%',
    marginTop: 32,
    alignItems: 'center',
  },
  buttonPrimary: {
    width: '100%',
    height: 52,
    backgroundColor: '#E4B651',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Kanit_400Regular',
  },
  buttonSecondary: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2794AD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#2794AD',
    fontSize: 15,
    fontFamily: 'Kanit_400Regular',
  },
  buttonOutline: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonOutlineText: {
    color: '#E4B651',
    fontSize: 15,
    fontFamily: 'Kanit_400Regular',
  },
});
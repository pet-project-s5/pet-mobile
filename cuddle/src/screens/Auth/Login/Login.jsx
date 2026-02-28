import { useState } from 'react';
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
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
} from 'react-native';

export default function Login({ navigation }) {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!fontsLoaded) return null;

  const handleLogin = () => {
    console.log('Login:', email, password);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Camada de fundo — enfeites decorativos */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.cornerTopRight}>
          <View style={[styles.rect, styles.rect4]} />
          <View style={[styles.rect, styles.rect5]} />
          <View style={[styles.rect, styles.rect1]} />
        </View>
        <View style={styles.cornerBottomLeft}>
          <View style={[styles.rect, styles.rect4]} />
          <View style={[styles.rect, styles.rect5]} />
          <View style={[styles.rect, styles.rect1]} />
        </View>
      </View>

      {/* Camada de conteúdo */}
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Image source={require('../../../assets/icons/Logo.png')} style={styles.logoImage} />
          <Text style={styles.logoText}>Cuddle</Text>
        </View>
        <Text style={styles.subtitle}>Bem-vindo de volta!</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#8671FF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#8671FF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Não tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Register')}>
            <Text style={styles.registerLink}> Cadastre-se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 220,
    height: 220,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 220,
    height: 220,
    transform: [{ rotate: '180deg' }],
  },
  rect: {
    position: 'absolute',
    width: 174,
    height: 174,
    borderRadius: 20,
  },
  rect4: {
    top: -98,
    right: -60,
    backgroundColor: '#8671FF',
    transform: [{ rotate: '-110.66deg' }],
  },
  rect5: {
    top: -105,
    right: -65,
    backgroundColor: 'transparent',
    borderWidth: 5,
    borderColor: '#624CE2',
    transform: [{ rotate: '-505deg' }],
  },
  rect1: {
    top: -96,
    right: -44,
    backgroundColor: 'transparent',
    borderWidth: 5,
    borderColor: '#3925A9',
    transform: [{ rotate: '-100deg' }],
  },
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
    marginBottom: 8,
  },
  logoImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Kanit_400Regular',
    color: '#624CE2',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8671FF',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Kanit_400Regular',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#8671FF',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    fontFamily: 'Kanit_400Regular',
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#8671FF',
    fontSize: 13,
    marginBottom: 24,
  },
  button: {
    height: 52,
    backgroundColor: '#75CF71',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Kanit_400Regular',
  },
  registerLink: {
    color: '#75CF71',
    fontSize: 14,
    fontWeight: '700',
  },
});

import { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';

export default function Splash({ navigation }) {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    KronaOne_400Regular,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const timer = setTimeout(() => {
      navigation?.replace('Login');
    }, 2000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>

      {/* Background */}
      <Image
        source={require('../../assets/icons/frameBackground.png')}
        style={styles.background}
        pointerEvents="none"
      />

      {/* Logo centralizado */}
      <View style={styles.center}>
        <Image
          source={require('../../assets/icons/Logo.png')}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>Cuddle</Text>
        <Text style={styles.slogan}>cuidar é amar</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F7FB',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 40,
    fontFamily: 'KronaOne_400Regular',
    color: '#2794AD',
  },
  slogan: {
    fontSize: 13,
    fontFamily: 'KronaOne_400Regular',
    color: '#8DD6E6',
    letterSpacing: 0.5,
  },
});

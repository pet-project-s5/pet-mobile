import { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useFonts, Kanit_400Regular } from '@expo-google-fonts/kanit';
import { Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';

export default function Splash({ navigation }) {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
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

      {/* Logo centralizado */}
      <View style={styles.center}>
        <Image
          source={require('../../assets/icons/Logo.png')}
          style={styles.logoImage}
        />
        <Text style={styles.logoText}>Cuddle</Text>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
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
    fontFamily: 'Kanit_400Regular',
    color: '#624CE2',
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
});

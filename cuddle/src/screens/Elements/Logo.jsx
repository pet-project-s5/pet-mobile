import { View, Text, Image, StyleSheet } from 'react-native';

export default function Logo({ small = false }) {
  return (
    <View style={[styles.logoRow, small && styles.logoRowSmall]}>
      <Image
        source={require('../../assets/icons/Logo.png')}
        style={[styles.logoImage, small && styles.logoImageSmall]}
      />
      <View style={styles.logoTextCol}>
        <Text style={[styles.logoText, small && styles.logoTextSmall]}>Cuddle</Text>
        <Text style={[styles.slogan, small && styles.sloganSmall]}>cuidar é amar</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 50,
  },
  logoRowSmall: {
    marginBottom: 0,
  },
  logoImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  logoImageSmall: {
    width: 32,
    height: 32,
  },
  logoTextCol: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'KronaOne_400Regular',
    color: '#2794AD',
    lineHeight: 36,
  },
  logoTextSmall: {
    fontSize: 22,
    lineHeight: 26,
  },
  slogan: {
    fontSize: 13,
    fontFamily: 'KronaOne_400Regular',
    color: '#8DD6E6',
    letterSpacing: 0.5,
  },
  sloganSmall: {
    fontSize: 9,
  },
});

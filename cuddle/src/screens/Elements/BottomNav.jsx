import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { PawPrint, Scissors, Clock3 } from 'lucide-react-native';

const ACTIVE = '#1E93AD';
const INACTIVE = '#B8DFE8';

export default function BottomNav({ navigation, activeTab, userId = 1 }) {
  const go = (screen) => {
    const currentRouteName = navigation?.getState?.()?.routes?.[navigation?.getState?.()?.index]?.name;
    if (currentRouteName === screen) return;
    navigation?.replace(screen, { userId });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.75}
        onPress={() => go('Home')}
      >
        <PawPrint size={26} color={activeTab === 'home' ? ACTIVE : INACTIVE} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.75}
        onPress={() => go('Services')}
      >
        <Scissors size={26} color={activeTab === 'services' ? ACTIVE : INACTIVE} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.75}
        onPress={() => go('Schedule')}
      >
        <Clock3 size={26} color={activeTab === 'schedule' ? ACTIVE : INACTIVE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 74,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#F4F4F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  navButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { PawPrint, Scissors, Clock3, UserRound, BarChart2 } from 'lucide-react-native'; // 👈 BarChart2 adicionado
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../contexts/SettingsContext';
import { getIsAdm, getUserId, getUserName } from '../../services/auth';

const ACTIVE   = '#1E93AD';
const INACTIVE = '#B8DFE8';
const NAV_BASE_HEIGHT = 74;

export default function BottomNav({ navigation, activeTab, userId, userName, isAdm }) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  const effectiveUserId = userId ?? getUserId();
  const effectiveUserName = (userName ?? getUserName() ?? '');
  const effectiveIsAdm = typeof isAdm === 'boolean' ? isAdm : Boolean(getIsAdm());

  const go = (screen) => {
    if (screen === 'Dashboard' && !effectiveIsAdm) return;
    const state = navigation?.getState?.();
    const currentName = state?.routes?.[state?.index]?.name;
    if (currentName === screen) return;
    navigation?.replace(screen, { userId: effectiveUserId, userName: effectiveUserName, isAdm: effectiveIsAdm });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.navBg,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom,
          height: NAV_BASE_HEIGHT + insets.bottom,
        },
      ]}
    >

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

      {/* 👇 botão Dashboard (admin only) */}
      {effectiveIsAdm ? (
        <TouchableOpacity
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.75}
          onPress={() => go('Dashboard')}
        >
          <BarChart2 size={26} color={activeTab === 'dashboard' ? ACTIVE : INACTIVE} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.75}
        onPress={() => go('UserProfile')}
      >
        <UserRound size={26} color={activeTab === 'profile' ? ACTIVE : INACTIVE} />
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

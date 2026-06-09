import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { PawPrint, Scissors, Clock3, UserRound, BarChart2, CalendarCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../contexts/SettingsContext';
import { getIsAdm, getUserId, getUserName } from '../../services/auth';

const ACTIVE   = '#1E93AD';
const INACTIVE = '#B8DFE8';
const NAV_BASE_HEIGHT = 74;

export default function BottomNav({ navigation, activeTab, userId, userName, isAdm }) {
  const { theme } = useSettings();
  const insets = useSafeAreaInsets();

  const effectiveUserId   = userId   ?? getUserId();
  const effectiveUserName = userName ?? getUserName() ?? '';
  const effectiveIsAdm    = typeof isAdm === 'boolean' ? isAdm : Boolean(getIsAdm());

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.navBg,
      borderTopColor: theme.border,
      paddingBottom: insets.bottom,
      height: NAV_BASE_HEIGHT + insets.bottom,
    },
  ];

  const go = (screen) => {
    const state = navigation?.getState?.();
    const currentName = state?.routes?.[state?.index]?.name;
    if (currentName === screen) return;
    navigation?.replace(screen, { userId: effectiveUserId, userName: effectiveUserName, isAdm: effectiveIsAdm });
  };

  const btn = (screen, tab, Icon) => (
    <TouchableOpacity
      style={styles.navButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.75}
      onPress={() => go(screen)}
    >
      <Icon size={26} color={activeTab === tab ? ACTIVE : INACTIVE} />
    </TouchableOpacity>
  );

  if (effectiveIsAdm) {
    return (
      <View style={containerStyle}>
        {btn('Dashboard',          'dashboard',          BarChart2)}
        {btn('AdminAppointments',  'adminAppointments',  CalendarCheck)}
        {btn('UserProfile',        'profile',            UserRound)}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {btn('Home',        'home',     PawPrint)}
      {btn('Services',    'services', Scissors)}
      {btn('Schedule',    'schedule', Clock3)}
      {btn('UserProfile', 'profile',  UserRound)}
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

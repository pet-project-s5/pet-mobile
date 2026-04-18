import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Kanit_400Regular, Kanit_700Bold } from '@expo-google-fonts/kanit';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import { SettingsProvider, useSettings } from './src/contexts/SettingsContext';
import Splash from './src/screens/Splash/Splash';
import Login from './src/screens/Auth/Login/Login';
import Register from './src/screens/Auth/Register/Register';
import Home from './src/screens/Main/Home/Home';
import Services from './src/screens/Main/Services/Services';
import Schedule from './src/screens/Main/Schedule/Schedule';
import ScheduleCreate from './src/screens/Main/Schedule/ScheduleCreate';
import PetProfile from './src/screens/Main/Pet/PetProfile';
import PetEdit from './src/screens/Main/Pet/PetEdit';
import UserProfile from './src/screens/Main/Profile/UserProfile';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Kanit_400Regular,
    Kanit_700Bold,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
    KronaOne_400Regular,
  });

  return (
    <SettingsProvider>
      <ThemedApp fontsLoaded={fontsLoaded} />
    </SettingsProvider>
  );
}

function ThemedApp({ fontsLoaded }) {
  const { theme } = useSettings();
  if (!fontsLoaded) return null;

  return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="Splash" component={Splash} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Services" component={Services} />
          <Stack.Screen name="Schedule" component={Schedule} />
          <Stack.Screen name="ScheduleCreate" component={ScheduleCreate} />
          <Stack.Screen name="PetProfile" component={PetProfile} />
          <Stack.Screen name="PetEdit" component={PetEdit} />
          <Stack.Screen name="UserProfile" component={UserProfile} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}

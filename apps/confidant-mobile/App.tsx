import { StatusBar } from 'expo-status-bar';
import { Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LLMProvider } from './src/context/LLMContext';
import { ChatScreen } from './src/screens/ChatScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LockScreen } from './src/screens/LockScreen';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // TODO: replace with real lock state (e.g. from secure store)
  const isLocked = false;

  return (
    <LLMProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: true }}
          initialRouteName={isLocked ? 'Lock' : 'Chat'}
        >
          <Stack.Screen name="Lock" component={LockScreen} options={{ title: 'Confidant' }} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ navigation }) => ({
              title: 'Chat',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginRight: 16 }}>
                  <Text style={{ fontSize: 17, color: '#007AFF' }}>Settings</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </LLMProvider>
  );
}

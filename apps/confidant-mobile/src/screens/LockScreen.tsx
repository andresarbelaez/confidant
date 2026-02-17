import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Lock'>;

export function LockScreen({ navigation }: Props) {
  const [passcode, setPasscode] = useState('');

  const handleUnlock = () => {
    // Placeholder: no real passcode check yet
    if (passcode.length >= 4) {
      navigation.replace('Chat');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confidant is locked</Text>
      <Text style={styles.hint}>Enter your passcode to open the chat.</Text>
      <TextInput
        style={styles.input}
        placeholder="Passcode"
        placeholderTextColor="#888"
        value={passcode}
        onChangeText={setPasscode}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={8}
      />
      <TouchableOpacity style={styles.button} onPress={handleUnlock}>
        <Text style={styles.buttonLabel}>Unlock</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 8 },
  hint: { fontSize: 16, color: '#666', marginBottom: 24 },
  input: {
    width: '100%',
    maxWidth: 200,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  buttonLabel: { color: '#fff', fontWeight: '600', fontSize: 17 },
});

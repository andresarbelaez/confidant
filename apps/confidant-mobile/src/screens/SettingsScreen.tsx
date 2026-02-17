import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.label}>Passcode</Text>
        <Text style={styles.value}>Set passcode to lock chat (coming soon)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.row}>
        <Text style={styles.label}>RAG</Text>
        <Text style={styles.value}>Knowledge base & context (coming soon)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 17, fontWeight: '600', color: '#000' },
  value: { fontSize: 15, color: '#666', marginTop: 4 },
});

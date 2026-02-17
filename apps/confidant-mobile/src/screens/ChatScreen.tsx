import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Placeholder: no real model yet
  };

  const handleGenerate = () => {
    // Placeholder: will call native LLM and stream tokens
    const placeholder: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: '[Placeholder reply – LLM integration coming in PoC]',
    };
    setMessages((prev) => [...prev, placeholder]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>{item.text}</Text>
          </View>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.footer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendLabel}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
          <Text style={styles.generateLabel}>Generate (mock)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 8 },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#e5e5ea' },
  bubbleText: { fontSize: 16, color: '#000' },
  userBubbleText: { color: '#fff' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendLabel: { color: '#fff', fontWeight: '600' },
  generateButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#34C759',
    borderRadius: 20,
    justifyContent: 'center',
  },
  generateLabel: { color: '#fff', fontWeight: '600' },
});

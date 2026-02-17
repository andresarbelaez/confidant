import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useLLM } from '../context/LLMContext';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ navigation }: Props) {
  const { isReady, isModelLoaded, isDownloading, downloadProgress, error, downloadAndLoad, generateStream } =
    useLLM();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const cancelRef = useRef<(() => void) | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
  };

  const handleGenerate = async () => {
    if (!isModelLoaded || isGenerating) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const prompt = lastUser?.text ?? (input.trim() || 'Hello');
    if (!prompt) return;

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);
    setStreamingText('');
    setIsGenerating(true);

    try {
      const streamResult = generateStream(prompt, { maxTokens: 256, temperature: 0.7 });
      cancelRef.current = streamResult.cancel;

      let full = '';
      for await (const token of streamResult.stream) {
        full += token;
        setStreamingText(full);
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, text: full } : m))
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, text: `Error: ${(e as Error).message}` } : m
        )
      );
    } finally {
      setStreamingText('');
      cancelRef.current = null;
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    cancelRef.current?.();
  };

  const displayMessages = [...messages];
  if (streamingText) {
    const last = displayMessages[displayMessages.length - 1];
    if (last?.role === 'assistant') {
      displayMessages[displayMessages.length - 1] = { ...last, text: streamingText };
    } else {
      displayMessages.push({ id: 'streaming', role: 'assistant', text: streamingText });
    }
  }

  if (!isReady) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.centeredText}>Loading...</Text>
      </View>
    );
  }

  if (error && !isModelLoaded) {
    const isNoCapableProvider = error.includes('-422') || error.toLowerCase().includes('no capable provider');
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {isNoCapableProvider && (
          <Text style={styles.hintText}>
            The on-device LLM often doesn’t run in the iOS Simulator. Try running on a physical iPhone (same cable, then choose your device in Xcode or run: npx expo run:ios --device).
          </Text>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={downloadAndLoad}>
          <Text style={styles.primaryButtonLabel}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isModelLoaded) {
    return (
      <View style={styles.centered}>
        <Text style={styles.centeredText}>
          Download the on-device model to generate replies.
        </Text>
        {isDownloading ? (
          <>
            <ActivityIndicator size="large" style={{ marginTop: 16 }} />
            <Text style={styles.progressText}>
              {(downloadProgress * 100).toFixed(0)}%
            </Text>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={downloadAndLoad}>
            <Text style={styles.primaryButtonLabel}>Download model</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <FlatList
        data={displayMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const isLastAssistant = index === displayMessages.length - 1 && item.role === 'assistant';
          return (
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, item.role === 'user' && styles.userBubbleText]}>
                {item.text || (isLastAssistant && isGenerating ? '…' : '')}
              </Text>
              {isLastAssistant && isGenerating && <Text style={styles.cursor}>▊</Text>}
            </View>
          );
        }}
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
        {isGenerating ? (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
            <Text style={styles.stopLabel}>Stop</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
            <Text style={styles.generateLabel}>Generate</Text>
          </TouchableOpacity>
        )}
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
  cursor: { opacity: 0.6 },
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
  stopButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    justifyContent: 'center',
  },
  stopLabel: { color: '#fff', fontWeight: '600' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  centeredText: { fontSize: 17, color: '#333', textAlign: 'center', marginBottom: 16 },
  progressText: { marginTop: 8, fontSize: 15, color: '#666' },
  errorText: { fontSize: 15, color: '#FF3B30', textAlign: 'center', marginBottom: 16 },
  hintText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 16, paddingHorizontal: 16 },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  primaryButtonLabel: { color: '#fff', fontWeight: '600', fontSize: 17 },
});

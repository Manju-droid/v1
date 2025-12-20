import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { messageAPI } from '@v/api-client';
import type { Message, Conversation } from '@v/shared';
import { formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../../lib/auth-store';

export default function ChatScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to send messages');
      router.push('/login');
      return;
    }
    loadConversation();
  }, [handle, user?.id]);

  const loadConversation = async () => {
    if (!user?.id || !handle) return;

    try {
      // First, try to find or create conversation
      // For now, we'll fetch messages directly
      // In a real app, you'd get the other user's ID from handle
      const otherUserId = handle; // Assuming handle is the user ID for now
      
      // Try to get existing conversation
      const conversations = await messageAPI.listConversations({ userId: user.id });
      const existingConv = conversations.find(
        (c) =>
          (c.participant1Id === user.id && c.participant2Id === otherUserId) ||
          (c.participant1Id === otherUserId && c.participant2Id === user.id)
      );

      if (existingConv) {
        setConversation(existingConv);
        const msgs = await messageAPI.getMessages(existingConv.id, {});
        setMessages(msgs || []);
      } else {
        // Create new conversation
        const newConv = await messageAPI.createConversation({
          userId1: user.id,
          userId2: otherUserId,
        });
        setConversation(newConv);
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !user?.id || !conversation) return;

    setSending(true);
    try {
      const newMessage = await messageAPI.sendMessage(conversation.id, {
        senderId: user.id,
        content: messageText.trim(),
      });
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    const createdAt = typeof item.createdAt === 'string'
      ? new Date(item.createdAt)
      : item.createdAt;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.messageOwn : styles.messageOther,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
          ]}
        >
          {formatRelativeTime(createdAt)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || !messageText.trim()}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1117',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '75%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  messageOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#06B6D4',
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#1F2937',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFFFFF',
  },
  messageTextOther: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0C1117',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

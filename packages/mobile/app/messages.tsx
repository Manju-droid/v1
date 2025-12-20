import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { messageAPI } from '@v/api-client';
import type { Conversation } from '@v/shared';
import { formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';

export default function MessagesScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await messageAPI.listConversations({ userId: user.id });
      // Fetch unread counts and last messages for each conversation
      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv: Conversation) => {
          try {
            const [unreadCount, messages] = await Promise.all([
              messageAPI.getUnreadCount(conv.id, user.id),
              messageAPI.getMessages(conv.id, { limit: 1 }),
            ]);
            
            const lastMessage = messages && messages.length > 0 ? messages[0] : null;
            const lastMessageTime = lastMessage 
              ? (typeof lastMessage.createdAt === 'string' ? new Date(lastMessage.createdAt).getTime() : lastMessage.createdAt.getTime())
              : (typeof conv.updatedAt === 'string' ? new Date(conv.updatedAt).getTime() : conv.updatedAt.getTime());
            
            return {
              ...conv,
              unreadCount,
              lastMessage: lastMessage?.content || null,
              lastMessageTime,
            };
          } catch (error) {
            return {
              ...conv,
              unreadCount: 0,
              lastMessage: null,
              lastMessageTime: typeof conv.updatedAt === 'string' ? new Date(conv.updatedAt).getTime() : conv.updatedAt.getTime(),
            };
          }
        })
      );
      
      // Sort by last message time (most recent first)
      enrichedConversations.sort((a: any, b: any) => b.lastMessageTime - a.lastMessageTime);
      setConversations(enrichedConversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      if (error?.status !== 401) {
        Alert.alert('Error', 'Failed to load conversations');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Get the other participant's ID
    const otherParticipantId =
      conversation.participant1Id === user?.id
        ? conversation.participant2Id
        : conversation.participant1Id;
    router.push(`/messages/${otherParticipantId}`);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Sign in to view messages</Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation from a user's profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={({ item }) => {
            const otherParticipantId =
              item.participant1Id === user?.id
                ? item.participant2Id
                : item.participant1Id;
            const updatedAt = typeof item.updatedAt === 'string'
              ? new Date(item.updatedAt)
              : item.updatedAt;

            return (
              <TouchableOpacity
                style={styles.conversationItem}
                onPress={() => handleConversationPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationAvatar}>
                  <Text style={styles.avatarText}>
                    {otherParticipantId.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName}>
                      User {otherParticipantId.slice(0, 8)}
                    </Text>
                    <View style={styles.headerRight}>
                      {(item as any).lastMessageTime && (
                        <Text style={styles.conversationTime}>
                          {formatRelativeTime(new Date((item as any).lastMessageTime))}
                        </Text>
                      )}
                      {(item as any).unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
                            {(item as any).unreadCount > 99 ? '99+' : (item as any).unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {(item as any).lastMessage && (
                    <Text 
                      style={[
                        styles.lastMessage,
                        (item as any).unreadCount > 0 && styles.lastMessageUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {(item as any).lastMessage}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06B6D4"
            />
          }
        />
      )}
    </View>
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadBadge: {
    backgroundColor: '#06B6D4',
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  lastMessageUnread: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

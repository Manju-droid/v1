import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { userAPI } from '@v/api-client';
import { useAuthStore } from '../lib/auth-store';

interface Follower {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  isFollowing: boolean;
}

interface FollowersModalProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
}

export function FollowersModal({ userId, visible, onClose, type }: FollowersModalProps) {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible && userId) {
      loadUsers();
    }
  }, [visible, userId, type]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = type === 'followers'
        ? await userAPI.getFollowers(userId, {})
        : await userAPI.getFollowing(userId, {});
      
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser?.id) return;

    try {
      const user = users.find(u => u.id === targetUserId);
      if (user?.isFollowing) {
        await userAPI.unfollow(targetUserId, { followerId: currentUser.id });
      } else {
        await userAPI.follow(targetUserId, { followerId: currentUser.id });
      }
      setUsers(prev =>
        prev.map(u =>
          u.id === targetUserId ? { ...u, isFollowing: !u.isFollowing } : u
        )
      );
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {type === 'followers' ? 'Followers' : 'Following'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#06B6D4" />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found' : `No ${type} yet`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.userItem}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userHandle}>@{item.handle}</Text>
                  </View>
                  {item.id !== currentUser?.id && (
                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        item.isFollowing && styles.followingButton,
                      ]}
                      onPress={() => handleFollow(item.id)}
                    >
                      <Text
                        style={[
                          styles.followButtonText,
                          item.isFollowing && styles.followingButtonText,
                        ]}
                      >
                        {item.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0C1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  searchInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  centerContent: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  followButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: '#9CA3AF',
  },
});

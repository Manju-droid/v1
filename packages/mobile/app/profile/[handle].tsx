import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { userAPI, postAPI } from '@v/api-client';
import type { User, Post } from '@v/shared';
import { formatNumber } from '@v/shared';
import { useAuthStore } from '../../lib/auth-store';
import { FollowersModal } from '../../components/FollowersModal';
import { PostCard } from '../../components/PostCard';

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const { isAuthenticated, user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'saved'>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [handle]);

  useEffect(() => {
    if (profile?.id) {
      userAPI.getById(profile.id)
        .then((user) => {
          setUserPoints({
            points: user.points || 0,
            tier: user.tier || 'SILVER',
            subscriptionActive: user.subscriptionActive || false,
            loginStreak: user.loginStreak || 0,
            debatesHostedToday: user.debatesHostedToday || 0,
          });
        })
        .catch(console.error);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      if (activeTab === 'saved' && isOwnProfile) {
        loadSavedPosts();
      } else {
        loadPosts();
      }
    }
  }, [profile?.id, activeTab, isOwnProfile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await userAPI.getByHandle(handle);
      
      // Get counts
      const [followersData, followingData, postsData] = await Promise.all([
        userAPI.getFollowers(user.id, {}).catch(() => ({ users: [] })),
        userAPI.getFollowing(user.id, {}).catch(() => ({ users: [] })),
        postAPI.list({ authorId: user.id }).catch(() => []),
      ]);

      const followers = (followersData as any).users || [];
      const following = (followingData as any).users || [];
      const userPosts = Array.isArray(postsData) ? postsData : [];

      const isFollowing = currentUser?.id
        ? followers.some((f: any) => f.id === currentUser.id)
        : false;

      setProfile({
        ...user,
        isFollowing,
        counts: {
          posts: userPosts.length,
          followers: followers.length,
          following: following.length,
        },
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPosts = async () => {
    if (!profile?.id) return;
    
    try {
      setLoadingPosts(true);
      const data = await postAPI.list({ authorId: profile.id });
      const allPosts = Array.isArray(data) ? data : [];
      
      // Filter based on active tab
      let filtered = allPosts;
      if (activeTab === 'posts') {
        // Only posts (not replies - replies start with @)
        filtered = allPosts.filter((post: any) => {
          const content = (post.content || '').toLowerCase();
          return !content.startsWith('@');
        });
      } else if (activeTab === 'replies') {
        // Only replies (start with @)
        filtered = allPosts.filter((post: any) => {
          const content = (post.content || '').toLowerCase();
          return content.startsWith('@');
        });
      } else if (activeTab === 'media') {
        // Only posts with media
        filtered = allPosts.filter((post: any) => !!post.media);
      }
      
      setPosts(filtered);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadSavedPosts = async () => {
    if (!currentUser?.id) return;
    
    try {
      setLoadingPosts(true);
      const data = await postAPI.getSavedPosts(currentUser.id);
      setSavedPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading saved posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleFollow = async () => {
    if (!isAuthenticated || !currentUser?.id || !profile?.id) {
      Alert.alert('Sign In Required', 'Please sign in to follow users');
      router.push('/login');
      return;
    }

    try {
      if (profile.isFollowing) {
        await userAPI.unfollow(profile.id, { followerId: currentUser.id });
        setProfile((prev: any) => ({ ...prev, isFollowing: false }));
        loadProfile(); // Refresh to update counts
      } else {
        await userAPI.follow(profile.id, { followerId: currentUser.id });
        setProfile((prev: any) => ({ ...prev, isFollowing: true }));
        loadProfile(); // Refresh to update counts
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleMessage = () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to send messages');
      router.push('/login');
      return;
    }
    router.push(`/messages/${profile.handle}`);
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async (updates: { name?: string; bio?: string }) => {
    if (!profile?.id) return;

    try {
      await userAPI.update(profile.id, updates);
      setProfile((prev: any) => ({ ...prev, ...updates }));
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const isOwnProfile = currentUser?.id === profile?.id;

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayPosts = activeTab === 'saved' ? savedPosts : posts;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06B6D4" />
      }
    >
      {/* Cover Photo */}
      {profile.coverPhotoUrl && (
        <View style={styles.coverPhoto}>
          <Image
            source={{ uri: profile.coverPhotoUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>
      )}

      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.avatarUrl ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name || 'Unknown'}</Text>
            <Text style={styles.profileHandle}>@{profile.handle}</Text>
            {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isOwnProfile ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.followButton,
                  profile.isFollowing && styles.followingButton,
                ]}
                onPress={handleFollow}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    profile.isFollowing && styles.followingButtonText,
                  ]}
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={handleMessage}
              >
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setShowFollowersModal(true)}
          >
            <Text style={styles.statValue}>
              {formatNumber(profile.counts?.posts || 0)}
            </Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setShowFollowersModal(true)}
          >
            <Text style={styles.statValue}>
              {formatNumber(profile.counts?.followers || 0)}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setShowFollowingModal(true)}
          >
            <Text style={styles.statValue}>
              {formatNumber(profile.counts?.following || 0)}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Points Display */}
        {userPoints && (
          <View style={styles.pointsSection}>
            <View style={styles.pointsHeader}>
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsLabel}>Points:</Text>
                <Text style={styles.pointsValue}>
                  {(userPoints.points || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>
                  {userPoints.tier === 'PLATINUM' ? '⭐ Platinum' : '🥈 Silver'}
                </Text>
              </View>
              {userPoints.subscriptionActive && (
                <View style={styles.subscriptionBadge}>
                  <Text style={styles.subscriptionText}>Subscribed</Text>
                </View>
              )}
            </View>
            {userPoints.tier === 'SILVER' && userPoints.points < 1000 && (
              <Text style={styles.pointsToNext}>
                {1000 - (userPoints.points || 0)} points until Platinum
              </Text>
            )}
            {userPoints.loginStreak > 0 && (
              <Text style={styles.streakText}>
                🔥 {userPoints.loginStreak} day streak
              </Text>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'posts' && styles.tabTextActive,
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'replies' && styles.tabActive]}
            onPress={() => setActiveTab('replies')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'replies' && styles.tabTextActive,
              ]}
            >
              Replies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'media' && styles.tabActive]}
            onPress={() => setActiveTab('media')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'media' && styles.tabTextActive,
              ]}
            >
              Media
            </Text>
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
              onPress={() => setActiveTab('saved')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'saved' && styles.tabTextActive,
                ]}
              >
                Saved
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Posts Content */}
        {loadingPosts ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : displayPosts.length === 0 ? (
          <View style={styles.contentPlaceholder}>
            <Text style={styles.placeholderText}>
              {activeTab === 'posts' && 'No posts yet'}
              {activeTab === 'replies' && 'No replies yet'}
              {activeTab === 'media' && 'No media yet'}
              {activeTab === 'saved' && 'No saved posts yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.postsList}>
            {displayPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => router.push(`/posts/${post.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      {/* Modals */}
      <FollowersModal
        userId={profile.id}
        visible={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        type="followers"
      />
      <FollowersModal
        userId={profile.id}
        visible={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        type="following"
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        profile={profile}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
      />
    </ScrollView>
  );
}

interface EditProfileModalProps {
  visible: boolean;
  profile: any;
  onClose: () => void;
  onSave: (updates: { name?: string; bio?: string }) => void;
}

function EditProfileModal({ visible, profile, onClose, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = () => {
    onSave({ name, bio });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={editModalStyles.overlay}>
        <View style={editModalStyles.content}>
          <View style={editModalStyles.header}>
            <Text style={editModalStyles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={editModalStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={editModalStyles.form}>
            <Text style={editModalStyles.label}>Name</Text>
            <TextInput
              style={editModalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#6B7280"
            />

            <Text style={editModalStyles.label}>Bio</Text>
            <TextInput
              style={[editModalStyles.input, editModalStyles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={editModalStyles.saveButton} onPress={handleSave}>
              <Text style={editModalStyles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const editModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0C1117',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#06B6D4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1117',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  coverPhoto: {
    height: 150,
    backgroundColor: '#1F2937',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    marginTop: -50,
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#0C1117',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0C1117',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
    marginTop: 50,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#06B6D4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#1F2937',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#9CA3AF',
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1F2937',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pointsSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tierBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subscriptionBadge: {
    backgroundColor: '#9333EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pointsToNext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#14B8A6',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#06B6D4',
  },
  tabText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#06B6D4',
    fontWeight: '600',
  },
  contentPlaceholder: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  postsList: {
    gap: 12,
  },
});

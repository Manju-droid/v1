import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { postAPI } from '@v/api-client';
import { Post, formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';
import { PostCard } from '../components/PostCard';

export default function PostsScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const POSTS_PER_PAGE = 20;

  const fetchPosts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setRefreshing(true);
        setOffset(0);
      }

      const currentOffset = reset ? 0 : offset;
      const data = await postAPI.list({
        limit: POSTS_PER_PAGE,
        offset: currentOffset,
      });

      if (reset) {
        setPosts(data || []);
      } else {
        setPosts(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === POSTS_PER_PAGE);
      setOffset(currentOffset + (data || []).length);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setError(err?.message || 'Failed to load posts');
      if (err?.status === 401 || err?.status === 403) {
        // Not authenticated, but don't show error
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => {
    fetchPosts(true);
  }, []);

  const onRefresh = () => {
    fetchPosts(true);
  };

  const loadMore = () => {
    if (!isLoading && hasMore && !refreshing) {
      fetchPosts(false);
    }
  };

  const handlePostPress = (postId: string) => {
    router.push(`/posts/${postId}`);
  };

  const handleCreatePost = () => {
    router.push('/posts/create');
  };

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        {isAuthenticated && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePost}
          >
            <Text style={styles.createButtonText}>+ New Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            {isAuthenticated
              ? 'Be the first to share something!'
              : 'Sign in to see posts and create your own'}
          </Text>
          {!isAuthenticated && (
            <TouchableOpacity
              style={styles.authButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => handlePostPress(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#06B6D4"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && !refreshing ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#06B6D4" />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
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
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  authButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});

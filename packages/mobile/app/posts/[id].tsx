import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { postAPI } from '@v/api-client';
import { Post, Comment, formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../../lib/auth-store';
import { PostCard } from '../../components/PostCard';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    try {
      const data = await postAPI.get(id);
      setPost(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching post:', err);
      if (err?.status === 404) {
        setError('Post not found');
      } else {
        setError(err?.message || 'Failed to load post');
      }
    }
  };

  const fetchComments = async () => {
    try {
      const data = await postAPI.getComments(id);
      setComments(data || []);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchPost(), fetchComments()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !currentUser || !isAuthenticated) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      const newComment = await postAPI.createComment(id, {
        postId: id,
        authorId: currentUser.id,
        content: commentText.trim(),
      });

      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      
      // Update post comment count
      if (post) {
        setPost({
          ...post,
          commentCount: (post.commentCount || 0) + 1,
        });
      }
    } catch (err: any) {
      console.error('Error creating comment:', err);
      setError(err?.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading && !post) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </View>
    );
  }

  if (error && !post) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06B6D4"
          />
        }
      >
        {/* Post */}
        <PostCard post={post} showFullContent />

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>

          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentsText}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <Text style={styles.commentContent}>{comment.content}</Text>
                <Text style={styles.commentTime}>
                  {formatRelativeTime(new Date(comment.createdAt))}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      {isAuthenticated && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#6B7280"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!commentText.trim() || isSubmittingComment) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || isSubmittingComment}
          >
            {isSubmittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    padding: 20,
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for comment input
  },
  commentsSection: {
    marginTop: 24,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyComments: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCommentsText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  commentCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  commentContent: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0C1117',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { Post, formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  showFullContent?: boolean;
}

export function PostCard({ post, onPress, showFullContent = false }: PostCardProps) {
  const { user: currentUser } = useAuthStore();
  const [isReacted, setIsReacted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Extract author info (post might have author object or just authorId)
  const author = (post as any).author || { id: post.authorId, name: 'Unknown', handle: 'unknown' };
  const isOwnPost = currentUser && author.id === currentUser.id;

  const handleReact = async () => {
    // TODO: Implement react API call
    setIsReacted(!isReacted);
  };

  const handleSave = async () => {
    // TODO: Implement save API call
    setIsSaved(!isSaved);
  };

  const handleComment = () => {
    if (onPress) {
      onPress();
    }
  };

  const handleShare = async () => {
    // TODO: Implement share functionality
    const shareText = `${author.name} (@${author.handle}): ${post.content}`;
    // Use React Native Share API
  };

  const handleTranslate = async () => {
    if (showTranslation) {
      // Toggle back to original
      setShowTranslation(false);
      return;
    }

    // If already translated, just show it
    if (translatedContent) {
      setShowTranslation(true);
      return;
    }

    // Get user's secondary language (default to Telugu)
    const targetLang = currentUser?.languages?.[1] || 'te';
    const API_BASE_URL = 'http://localhost:8080/api';

    setIsTranslating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/translate?lang=${targetLang}`);
      if (!response.ok) throw new Error('Translation failed');

      const result = await response.json();
      // Backend returns { success: true, data: { translatedContent: "..." } }
      const translated = result.data?.translatedContent || result.translatedContent || '';

      if (!translated) {
        throw new Error('No translation in response');
      }

      setTranslatedContent(translated);
      setShowTranslation(true);
    } catch (err) {
      console.error('Translation error:', err);
      // Could add toast notification here
    } finally {
      setIsTranslating(false);
    }
  };

  // Render hashtags in content
  const renderContent = () => {
    const content = post.content || '';
    const parts = content.split(/(#\w+)/g);

    return (
      <Text style={styles.content}>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Text key={index} style={styles.hashtag}>
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Author Header */}
      <View style={styles.authorHeader}>
        <View style={styles.authorInfo}>
          {author.avatar ? (
            <Image source={{ uri: author.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {author.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{author.name || 'Unknown'}</Text>
            <Text style={styles.authorHandle}>@{author.handle || 'unknown'}</Text>
          </View>
        </View>
        <Text style={styles.timestamp}>
          {formatRelativeTime(new Date(post.createdAt))}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {showTranslation ? (
          <>
            <Text style={styles.content}>{translatedContent}</Text>
            <Text style={styles.translationIndicator}>🌐 Translated from original</Text>
          </>
        ) : (
          renderContent()
        )}
      </View>

      {/* Media */}
      {post.mediaUrl && (
        <Image
          source={{ uri: post.mediaUrl }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statText}>
          {post.reactionCount || 0} reactions
        </Text>
        <Text style={styles.statText}>
          {post.commentCount || 0} comments
        </Text>
        {post.reach24h !== undefined && (
          <Text style={styles.statText}>
            {post.reach24h} reach
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleReact}
        >
          <Text style={[styles.actionIcon, isReacted && styles.actionIconActive]}>
            {isReacted ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, isReacted && styles.actionTextActive]}>
            React
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleComment}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
        >
          <Text style={[styles.actionIcon, isSaved && styles.actionIconActive]}>
            {isSaved ? '🔖' : '📌'}
          </Text>
          <Text style={[styles.actionText, isSaved && styles.actionTextActive]}>
            Save
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShare}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleTranslate}
          disabled={isTranslating}
        >
          <Text style={styles.actionIcon}>{isTranslating ? '⏳' : '🌐'}</Text>
          <Text style={[styles.actionText, showTranslation && styles.translationActive]}>
            {isTranslating ? 'Loading...' : showTranslation ? 'Original' : 'Translate'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#06B6D4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  authorHandle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  contentContainer: {
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  hashtag: {
    color: '#06B6D4',
    fontWeight: '600',
  },
  media: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  actionIconActive: {
    opacity: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actionTextActive: {
    color: '#06B6D4',
  },
  translationIndicator: {
    fontSize: 12,
    color: '#A78BFA',
    marginTop: 8,
    fontStyle: 'italic',
  },
  translationActive: {
    color: '#A78BFA',
    fontWeight: '600',
  },
});

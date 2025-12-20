import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { postAPI } from '@v/api-client';
import { useAuthStore } from '../../lib/auth-store';

export default function CreatePostScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Please sign in to create a post</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Post content cannot be empty');
      return;
    }

    if (content.length > 500) {
      setError('Post content must be 500 characters or less');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newPost = await postAPI.create({
        authorId: user.id,
        content: content.trim(),
      });

      // Success - navigate back
      router.back();
      
      // Show success message (you could use a toast library here)
      Alert.alert('Success', 'Post created successfully!');
    } catch (err: any) {
      console.error('Error creating post:', err);
      setError(err?.message || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (content.trim()) {
      Alert.alert(
        'Discard Post?',
        'Are you sure you want to discard this post?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const characterCount = content.length;
  const maxLength = 500;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            style={[
              styles.submitButton,
              (!content.trim() || isSubmitting) && styles.submitButtonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Content Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#6B7280"
            value={content}
            onChangeText={(text) => {
              setContent(text);
              setError(null);
            }}
            multiline
            maxLength={maxLength}
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            <Text
              style={[
                styles.characterCount,
                characterCount > maxLength * 0.9 && styles.characterCountWarning,
              ]}
            >
              {characterCount} / {maxLength}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Tip: Use #hashtags to make your post discoverable
          </Text>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  cancelButton: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    minHeight: 200,
  },
  footer: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  characterCountWarning: {
    color: '#F59E0B',
  },
  infoContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  authButton: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

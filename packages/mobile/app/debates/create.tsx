import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debateAPI } from '@v/api-client';
import type { CreateDebateRequest, DebateType } from '@v/shared';
import { validateCreateDebateRequest, VALID_DEBATE_DURATIONS } from '@v/shared';
import { useAuthStore } from '../../lib/auth-store';

export default function CreateDebateScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateDebateRequest>({
    title: '',
    description: '',
    category: '',
    hostId: user?.id || '',
    type: 'PUBLIC',
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    durationMinutes: 60,
    showInPulse: true,
  });

  React.useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to create a debate');
      router.push('/login');
      return;
    }
    setFormData((prev) => ({ ...prev, hostId: user.id }));
  }, [isAuthenticated, user]);

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    const validation = validateCreateDebateRequest({
      ...formData,
      hostId: user.id,
    });

    if (!validation.valid) {
      Alert.alert('Validation Error', validation.error || 'Invalid form data');
      return;
    }

    setLoading(true);
    try {
      const debate = await debateAPI.create({
        ...formData,
        hostId: user.id,
      });
      Alert.alert('Success', 'Debate created successfully', [
        { text: 'OK', onPress: () => router.replace(`/debates/${debate.id}`) },
      ]);
    } catch (error: any) {
      console.error('Error creating debate:', error);
      Alert.alert('Error', error.message || 'Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CreateDebateRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Debate</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={formData.title}
          onChangeText={(text) => updateField('title', text)}
          placeholder="Enter debate title"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => updateField('description', text)}
          placeholder="Enter debate description (optional)"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={formData.category}
          onChangeText={(text) => updateField('category', text)}
          placeholder="Enter category (optional)"
          placeholderTextColor="#6B7280"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              formData.type === 'PUBLIC' && styles.radioButtonActive,
            ]}
            onPress={() => updateField('type', 'PUBLIC')}
          >
            <Text
              style={[
                styles.radioText,
                formData.type === 'PUBLIC' && styles.radioTextActive,
              ]}
            >
              Public
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.radioButton,
              formData.type === 'PRIVATE' && styles.radioButtonActive,
            ]}
            onPress={() => updateField('type', 'PRIVATE')}
          >
            <Text
              style={[
                styles.radioText,
                formData.type === 'PRIVATE' && styles.radioTextActive,
              ]}
            >
              Private
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Duration (minutes)</Text>
        <View style={styles.durationButtons}>
          {VALID_DEBATE_DURATIONS.map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.durationButton,
                formData.durationMinutes === duration &&
                  styles.durationButtonActive,
              ]}
              onPress={() => updateField('durationMinutes', duration)}
            >
              <Text
                style={[
                  styles.durationButtonText,
                  formData.durationMinutes === duration &&
                    styles.durationButtonTextActive,
                ]}
              >
                {duration === 30
                  ? '30m'
                  : duration === 60
                  ? '1h'
                  : duration === 360
                  ? '6h'
                  : '24h'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.type === 'PUBLIC' && (
        <View style={styles.formGroup}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => updateField('showInPulse', !formData.showInPulse)}
          >
            <View
              style={[
                styles.checkbox,
                formData.showInPulse && styles.checkboxChecked,
              ]}
            >
              {formData.showInPulse && (
                <Text style={styles.checkboxCheckmark}>✓</Text>
              )}
            </View>
            <Text style={styles.checkboxLabel}>Show in Pulse</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>Create Debate</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C1117',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  radioButtonActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  radioText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  radioTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  durationButtonActive: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  durationButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  durationButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#1F2937',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

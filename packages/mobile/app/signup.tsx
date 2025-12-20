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
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthService } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Chinese (Mandarin)', 'Chinese (Cantonese)',
  'Japanese', 'Korean', 'Russian', 'Portuguese', 'Italian', 'Hindi', 'Arabic', 'Bengali',
  'Urdu', 'Indonesian', 'Turkish', 'Vietnamese', 'Telugu', 'Marathi', 'Tamil', 'Punjabi',
  'Javanese', 'Wu Chinese', 'Malay', 'Hausa', 'Swahili', 'Dutch', 'Polish', 'Ukrainian',
  'Greek', 'Thai', 'Persian', 'Romanian', 'Czech', 'Swedish', 'Hungarian', 'Hebrew',
  'Danish', 'Finnish', 'Norwegian',
].sort();

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();
  
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [language, setLanguage] = useState('English');
  const [bio, setBio] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSignup = async () => {
    // Clear previous errors
    clearError();
    setLocalError(null);

    // Validate inputs
    if (!name.trim()) {
      setLocalError('Name is required');
      return;
    }

    if (!handle.trim()) {
      setLocalError('Handle is required');
      return;
    }

    if (!AuthService.isValidHandle(handle.trim())) {
      setLocalError('Handle must be 3-30 characters, alphanumeric and underscores only');
      return;
    }

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!AuthService.isValidEmail(email.trim())) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setLocalError('Password is required');
      return;
    }

    if (!AuthService.isValidPassword(password)) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (!phoneNumber.trim()) {
      setLocalError('Phone number is required');
      return;
    }

    try {
      await signup({
        name: name.trim(),
        handle: handle.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim(),
        language,
        bio: bio.trim() || undefined,
      });
      
      // Navigation will be handled by auth state change
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorMessage = error?.message || 'Signup failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the V Platform community</Text>
          </View>

          {/* Error Message */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setLocalError(null);
                clearError();
              }}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          {/* Handle Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Handle</Text>
            <TextInput
              style={styles.input}
              placeholder="@username"
              placeholderTextColor="#6B7280"
              value={handle}
              onChangeText={(text) => {
                setHandle(text.replace(/[^a-zA-Z0-9_]/g, ''));
                setLocalError(null);
                clearError();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#6B7280"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLocalError(null);
                clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setLocalError(null);
                  clearError();
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeButtonText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                placeholderTextColor="#6B7280"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setLocalError(null);
                  clearError();
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Text style={styles.eyeButtonText}>
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor="#6B7280"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setLocalError(null);
                clearError();
              }}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          {/* Language Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Language</Text>
            <TextInput
              style={styles.input}
              placeholder="Select your language"
              placeholderTextColor="#6B7280"
              value={language}
              onChangeText={setLanguage}
              editable={!isLoading}
            />
          </View>

          {/* Bio Input (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about yourself"
              placeholderTextColor="#6B7280"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  eyeButton: {
    padding: 16,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  link: {
    color: '#06B6D4',
    fontSize: 14,
    fontWeight: '600',
  },
});

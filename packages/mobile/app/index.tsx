import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { formatRelativeTime } from '@v/shared';
import { useAuthStore } from '../lib/auth-store';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();

  useEffect(() => {
    // Check auth status
    const initAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };
    
    if (!isLoading) {
      initAuth();
    }
  }, [isLoading, checkAuth]);

  useEffect(() => {
    // Redirect based on auth status
    if (!isLoading) {
      if (isAuthenticated) {
        // User is logged in, show main app
        // For now, we'll show the home screen
        // Later we can redirect to a tabs layout
      } else {
        // User is not logged in, but we'll show the home screen
        // They can navigate to login/signup
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>V Platform</Text>
        <Text style={styles.subtitle}>Social Debate Platform</Text>
        
        {isAuthenticated && user ? (
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back, {user.name}!</Text>
            <Text style={styles.welcomeSubtext}>@{user.handle}</Text>
          </View>
        ) : (
          <View style={styles.authSection}>
            <Text style={styles.authTitle}>Get Started</Text>
            <Link href="/login" asChild>
              <TouchableOpacity testID="login-link" style={styles.authButton}>
                <Text style={styles.authButtonText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
            <Link href="/signup" asChild>
              <TouchableOpacity testID="signup-link" style={[styles.authButton, styles.authButtonSecondary]}>
                <Text style={styles.authButtonTextSecondary}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <Link href="/notifications" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>📬 Notifications</Text>
              <Text style={styles.buttonSubtext}>View your notifications</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/posts" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>📝 Posts</Text>
              <Text style={styles.buttonSubtext}>View and create posts</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/debates" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>💬 Debates</Text>
              <Text style={styles.buttonSubtext}>View and join debates</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/messages" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>💌 Messages</Text>
              <Text style={styles.buttonSubtext}>View conversations</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Shared Code Test</Text>
          <Text style={styles.infoText}>
            This app uses shared code from @v/shared
          </Text>
          <Text style={styles.infoText}>
            Example: formatRelativeTime utility is working! 
            {formatRelativeTime(new Date(Date.now() - 300000))}
          </Text>
        </View>
      </ScrollView>
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
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    marginBottom: 32,
  },
  welcomeSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#06B6D4',
  },
  authSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#06B6D4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  authButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#06B6D4',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonTextSecondary: {
    color: '#06B6D4',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  infoSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06B6D4',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
    lineHeight: 20,
  },
});

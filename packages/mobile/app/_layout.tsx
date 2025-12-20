import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/auth-store';
import { registerGlobals } from '@livekit/react-native';

// Register LiveKit globals
registerGlobals();

export default function RootLayout() {
  const { checkAuth } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay auth check to ensure React Native is fully initialized
    const timer = setTimeout(() => {
      const initAuth = async () => {
        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth check error:', error);
        } finally {
          setIsReady(true);
        }
      };
      
      initAuth();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [checkAuth]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0C1117',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#0C1117',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'V Platform',
            headerShown: false 
          }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ 
            title: 'Sign In',
            presentation: 'modal',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="signup" 
          options={{ 
            title: 'Sign Up',
            presentation: 'modal',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="notifications" 
          options={{ 
            title: 'Notifications',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="posts" 
          options={{ 
            title: 'Posts',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="posts/[id]" 
          options={{ 
            title: 'Post',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="posts/create" 
          options={{ 
            title: 'Create Post',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="debates" 
          options={{ 
            title: 'Debates',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="debates/[id]" 
          options={{ 
            title: 'Debate',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="debates/[id]/room" 
          options={{ 
            title: 'Debate Room',
            presentation: 'fullScreenModal'
          }} 
        />
        <Stack.Screen 
          name="debates/create" 
          options={{ 
            title: 'Create Debate',
            presentation: 'modal'
          }} 
        />
        <Stack.Screen 
          name="debates/stats" 
          options={{ 
            title: 'Debate Statistics',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="messages" 
          options={{ 
            title: 'Messages',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="messages/[handle]" 
          options={{ 
            title: 'Chat',
            presentation: 'card'
          }} 
        />
        <Stack.Screen 
          name="profile/[handle]" 
          options={{ 
            title: 'Profile',
            presentation: 'card'
          }} 
        />
      </Stack>
    </>
  );
}

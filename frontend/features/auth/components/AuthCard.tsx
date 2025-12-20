'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authAPI, setAuthToken } from '@v/api-client';
import { useStore } from '@/lib/store';

export function AuthCard() {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupHandle, setSignupHandle] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login({ email: loginEmail, password: loginPassword });
      setAuthToken(response.token);
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      document.cookie = `v_auth=${response.token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure=${typeof window !== 'undefined' && location.protocol === 'https:'}`;
      await useStore.getState().syncCurrentUser();
      router.push('/feed');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        handle: signupHandle,
        bio: 'New user',
        phoneNumber: '',
        language: 'English'
      });
      setAuthToken(response.token);
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      document.cookie = `v_auth=${response.token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax; Secure=${typeof window !== 'undefined' && location.protocol === 'https:'}`;
      await useStore.getState().syncCurrentUser();
      router.push('/feed');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('login')}
          className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
            activeTab === 'login' ? 'text-teal-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Login
          {activeTab === 'login' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('signup')}
          className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
            activeTab === 'signup' ? 'text-purple-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          Sign Up
          {activeTab === 'signup' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'login' ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <div className="text-red-400 text-xs text-center">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-teal-500 hover:bg-teal-400 text-black font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSignup}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Handle</label>
                <input
                  type="text"
                  value={signupHandle}
                  onChange={(e) => setSignupHandle(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="@johndoe"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <div className="text-red-400 text-xs text-center">{error}</div>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@v/api-client';
import { AuthService } from '@v/shared';
import { useStore } from '@/lib/store';

// Particle background component
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const particleCount = 40; // Reduced from 80

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      });
    }

    let animationFrameId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(20, 184, 166, 0.4)';

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.strokeStyle = `rgba(20, 184, 166, ${0.1 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Make page fixed (no scroll)
  useEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    // Remove scrollable classes
    htmlEl.classList.remove('page-scrollable');
    bodyEl.classList.remove('page-scrollable');

    // Add fixed class
    htmlEl.classList.add('page-fixed');
    bodyEl.classList.add('page-fixed');

    return () => {
      // Remove fixed class
      htmlEl.classList.remove('page-fixed');
      bodyEl.classList.remove('page-fixed');

      // Force scrollable
      htmlEl.style.cssText = 'overflow: auto !important; height: auto !important;';
      bodyEl.style.cssText = 'overflow: auto !important; height: auto !important;';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email and password are filled
    if (!email || !email.includes('@')) {
      setToast('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setToast('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Validate using shared service
      const validation = AuthService.validateLoginRequest({ email, password });
      if (!validation.valid) {
        setToast(validation.error || 'Invalid credentials');
        setIsLoading(false);
        return;
      }

      const response = await authAPI.login({ email, password });
      // Token is automatically set by authAPI.login()

      // Set cookie for middleware - use Lax for better Safari compatibility
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const cookieString = `v_auth=${response.token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      document.cookie = cookieString;

      // Verify cookie was set
      const cookieSet = document.cookie.includes('v_auth=');
      if (!cookieSet) {
        console.warn('[Login] Cookie not set, retrying...');
        // Retry setting cookie
        document.cookie = cookieString;
      }

      // Sync user to store immediately
      await useStore.getState().syncCurrentUser();

      setToast('Login successful! 🎉');

      // Use window.location for more reliable redirect, especially in Safari
      // Give a moment for cookie to be set and state to update
      const next = searchParams.get('next');
      const redirectUrl = next || '/feed';
      
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 300);
    } catch (error: any) {
      console.error('Login error:', error);
      setToast(error.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30">
      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 right-4 z-[60] bg-gray-900 border border-cyan-500/30 rounded-lg px-6 py-3 shadow-lg shadow-cyan-500/20"
        >
          <p className="text-white text-sm">{toast}</p>
        </motion.div>
      )}

      <ParticleBackground />

      <div className="fixed inset-0 bg-gradient-to-br from-gray-950/80 via-transparent to-purple-900/20 pointer-events-none z-0"></div>

      <div className="relative z-10 h-full flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-teal-500/20 rounded-2xl shadow-2xl shadow-teal-500/10 p-8 md:p-10 relative">
            {/* Header */}
            <div className="text-center mb-8">
              <Link href="/" className="text-3xl font-bold text-white inline-block mb-4">
                V
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-400 text-sm">
                Log in to continue your journey
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-2.5 bg-gray-950/50 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <a href="#" className="text-sm text-teal-400 hover:text-teal-300">
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-6 px-6 py-3 font-semibold rounded-lg transition-all shadow-lg ${isLoading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-teal-500 text-black hover:bg-teal-400 shadow-teal-500/20 hover:shadow-teal-500/40 cursor-pointer'
                  }`}
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-gray-400 mt-6">
                Don't have an account?{' '}
                <Link href="/signup" className="text-teal-400 hover:text-teal-300 font-medium">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


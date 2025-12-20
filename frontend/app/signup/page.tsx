'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    const particleCount = 30; // Reduced further for performance

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      });
    }

    let animationFrameId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(20, 184, 166, 0.3)';

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

const LANGUAGES = [
  'Spanish', 'French', 'German', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Japanese', 'Korean', 'Russian', 'Portuguese', 'Italian',
  'Hindi', 'Arabic', 'Bengali', 'Urdu', 'Indonesian', 'Turkish', 'Vietnamese', 'Telugu', 'Marathi', 'Tamil',
  'Punjabi', 'Javanese', 'Wu Chinese', 'Malay', 'Hausa', 'Swahili', 'Dutch', 'Polish', 'Ukrainian', 'Greek',
  'Thai', 'Persian', 'Romanian', 'Czech', 'Swedish', 'Hungarian', 'Hebrew', 'Danish', 'Finnish', 'Norwegian'
].sort();

export default function SignUpPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Lock scroll to ensure compact view
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    handle: '',
    phoneNumber: '',
    language: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    if (formData.password !== formData.confirmPassword) {
      setToast('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setToast('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!formData.language) {
      setToast('Please select a secondary language');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.signup({
        name: formData.name,
        email: formData.email,
        handle: formData.handle,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
        language: formData.language,
        bio: '',
      });

      // Token is automatically set by authAPI.signup()
      useStore.getState().setCurrentUser(response.user);
      router.push('/feed');
    } catch (error: any) {
      setToast(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setToast('Google Signup is not implemented yet');
  };

  return (
    <div className="min-h-screen bg-[#0C1117] flex items-center justify-center relative overflow-hidden">
      <ParticleBackground />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg z-50 backdrop-blur-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#161B22]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row gap-8"
        >
          {/* Left Side: Branding & Info */}
          <div className="md:w-1/3 flex flex-col justify-center border-r border-white/[0.05] pr-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Join V
            </h1>
            <p className="text-gray-400 mb-6">
              The ultimate platform for debates and discussions.
            </p>

            <div className="space-y-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-teal-400">✓</span> Global Community
              </div>
              <div className="flex items-center gap-2">
                <span className="text-teal-400">✓</span> Real-time Debates
              </div>
              <div className="flex items-center gap-2">
                <span className="text-teal-400">✓</span> Earn Points & Ranks
              </div>
            </div>

            <div className="mt-auto pt-8">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium block mt-1">
                  Log in here →
                </Link>
              </p>
            </div>
          </div>

          {/* Right Side: Compact Form */}
          <div className="md:w-2/3">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                {/* Handle */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                    <input
                      type="text"
                      name="handle"
                      required
                      value={formData.handle}
                      onChange={handleChange}
                      className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg pl-7 pr-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                      placeholder="username"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Secondary Language</label>
                  <select
                    name="language"
                    required
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all appearance-none"
                  >
                    <option value="" disabled>Select Language</option>
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Confirm</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-gray-100 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-[#161B22] text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="w-full bg-white text-gray-900 font-bold py-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

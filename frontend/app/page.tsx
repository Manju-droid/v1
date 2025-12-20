'use client';

import { useEffect, useRef, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { UserMenu } from '@/components/UserMenu';
import { useStore } from '@/lib/store';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Clear any stale auth data on landing page load to ensure clean state
  // This prevents auto-login from previous sessions when visiting the landing page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Check for force logout query parameter
      if (urlParams.get('logout') === 'true' || urlParams.get('clear') === 'true') {
        console.log('[Landing Page] Force logout requested via query parameter');
        // Clear all auth data
        document.cookie = 'v_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'v_auth=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
        useStore.getState().logout();
        // Remove query parameter and reload
        window.history.replaceState({}, '', '/');
        window.location.reload();
        return;
      }

      // Clear auth data only if explicitly requested or if no valid session exists
      // Check if there's a flag indicating user wants to see landing page without auth
      const showLandingOnly = sessionStorage.getItem('show_landing_only') === 'true';
      
      if (showLandingOnly || !localStorage.getItem('auth_token')) {
        console.log('[Landing Page] Clearing auth data to show landing page');
        const hostname = window.location.hostname;
        const domains = [hostname, '.' + hostname, ''];
        domains.forEach(domain => {
          document.cookie = `v_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT${domain ? `; domain=${domain}` : ''}`;
        });
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('show_landing_only'); // Clear the flag
        useStore.getState().logout();
      }
    }
  }, []);

  // Don't auto-redirect authenticated users - show landing page instead
  // Users can manually navigate to /feed or /login if they want
  useEffect(() => {
    // Just log the auth state, but don't redirect
    if (!authLoading) {
      if (isAuthenticated) {
        console.log('[Landing Page] User is authenticated, but showing landing page');
      } else {
        console.log('[Landing Page] User is not authenticated, showing landing page');
      }
    }
  }, [isAuthenticated, authLoading]);

  // Force scrollable page
  useLayoutEffect(() => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    // Remove any fixed classes
    htmlEl.classList.remove('page-fixed');
    bodyEl.classList.remove('page-fixed');

    // Add scrollable class
    htmlEl.classList.add('page-scrollable');
    bodyEl.classList.add('page-scrollable');

    // Force reset inline styles
    htmlEl.style.cssText = '';
    bodyEl.style.cssText = '';

    // Scroll to top
    window.scrollTo(0, 0);

    return () => {
      htmlEl.classList.remove('page-scrollable');
      bodyEl.classList.remove('page-scrollable');
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
    const particleCount = 35; // Reduced from 50

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, // Reduced speed
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
      });
    }

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Add purple accent to some particles
        const isPurple = i % 4 === 0;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = isPurple ? 'rgba(139, 92, 246, 0.12)' : 'rgba(20, 184, 166, 0.15)';
        ctx.fill();

        // Optimized line drawing
        for (let j = i + 1; j < particles.length; j++) {
          const otherParticle = particles[j];
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) { // Reduced from 150
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            const isPurpleLine = (i + j) % 5 === 0;
            ctx.strokeStyle = isPurpleLine
              ? `rgba(139, 92, 246, ${0.06 * (1 - distance / 120)})`
              : `rgba(20, 184, 166, ${0.08 * (1 - distance / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', resizeCanvas, { passive: true });
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/30">
      {/* Particle Background */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950/80 via-transparent to-purple-900/20 pointer-events-none z-0"></div>

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50"
      >
        <div className="w-full pl-4 lg:pl-6">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white"
            >
              V
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-1.5 sm:gap-2 pr-2"
            >
              {authLoading ? (
                <div className="w-9 h-9 rounded-full bg-gray-800/50 animate-pulse" />
              ) : isAuthenticated ? (
                <UserMenu />
              ) : (
                <>
                  <Link href="/login">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-3 sm:px-4 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 bg-transparent text-gray-300 hover:text-white hover:bg-gray-800/50 border border-gray-700 hover:border-gray-600 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      Log in
                    </motion.button>
                  </Link>
                  <Link href="/signup">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-3 sm:px-4 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 cursor-pointer"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="max-w-7xl px-4 lg:px-6">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-12 items-center">
            {/* Left - Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
              className="space-y-4 pr-4 lg:pr-8 flex flex-col justify-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl lg:text-6xl font-extrabold text-white leading-tight"
              >
                Bring People Together
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-base text-gray-300 leading-snug font-light"
              >
                Unite, debate, and achieve growth in a vibrant community.
              </motion.p>
              <Link href="/signup">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 30px rgba(20, 184, 166, 0.6), 0 0 60px rgba(20, 184, 166, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2.5 text-base rounded-lg font-semibold bg-teal-500 text-black hover:bg-teal-400 shadow-xl shadow-teal-500/40 transition-all duration-200 cursor-pointer"
                >
                  Join V Now
                </motion.button>
              </Link>
            </motion.div>

            {/* Right - Device Mockups */}
            <div className="relative min-h-[300px] md:min-h-[350px] lg:min-h-[420px] mt-4 lg:mt-0">
              {/* Animated background gradient */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 overflow-hidden rounded-2xl"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-purple-500/10 to-teal-500/10 blur-3xl"
                />
              </motion.div>
              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, x: 100, rotateZ: 0 }}
                animate={{ opacity: 1, x: 0, rotateZ: -8 }}
                transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 120 }}
                whileHover={{ scale: 1.05, rotateZ: -6 }}
                className="absolute w-[130px] sm:w-[140px] h-[230px] sm:h-[250px] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900"
                style={{
                  top: '18%',
                  left: '25%',
                  zIndex: 30,
                  boxShadow: '0 0 40px rgba(20, 184, 166, 0.5), 0 0 80px rgba(20, 184, 166, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(20, 184, 166, 0.1)',
                  border: '2px solid rgba(20, 184, 166, 0.4)',
                }}
              >
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[110px] sm:w-[120px] h-[190px] sm:h-[210px] bg-gray-950 rounded-lg overflow-hidden">
                  <div className="p-2 sm:p-3 space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[8px] font-semibold text-teal-400">Feed</div>
                      <div className="w-3 h-3 rounded-full bg-teal-500/30"></div>
                    </div>
                    {/* Post */}
                    <div className="bg-gray-900 rounded p-2 space-y-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-1.5 bg-gray-700 rounded w-16 mb-0.5"></div>
                          <div className="h-1 bg-gray-800 rounded w-10"></div>
                        </div>
                      </div>
                      <div className="h-12 sm:h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded mb-1"></div>
                      <div className="flex gap-1">
                        <div className="h-1 bg-teal-500/30 rounded w-8"></div>
                        <div className="h-1 bg-purple-500/30 rounded w-8"></div>
                        <div className="h-1 bg-gray-700 rounded flex-1"></div>
                      </div>
                    </div>
                    {/* Another post */}
                    <div className="bg-gray-900 rounded p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-purple-500/50 rounded-full"></div>
                        <div className="h-1 bg-gray-700 rounded flex-1"></div>
                      </div>
                      <div className="h-8 bg-gray-800 rounded"></div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tablet */}
              <motion.div
                initial={{ opacity: 0, x: 100, rotateZ: 0 }}
                animate={{ opacity: 1, x: 0, rotateZ: 4 }}
                transition={{ duration: 0.8, delay: 0.8, type: 'spring', stiffness: 120 }}
                whileHover={{ scale: 1.05, rotateZ: 6 }}
                className="absolute w-[170px] md:w-[185px] h-[220px] md:h-[240px] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 hidden md:block"
                style={{
                  top: '20%',
                  left: '50%',
                  zIndex: 20,
                  boxShadow: '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(139, 92, 246, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(139, 92, 246, 0.1)',
                  border: '2px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[150px] md:w-[165px] h-[180px] md:h-[200px] bg-gray-950 rounded-lg overflow-hidden">
                  <div className="p-3 space-y-2">
                    {/* Debate Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-purple-400">Debate</div>
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-purple-500/30"></div>
                        <div className="w-4 h-4 rounded bg-teal-500/30"></div>
                      </div>
                    </div>
                    {/* Debate card */}
                    <div className="bg-gray-900 rounded-lg p-3 border border-purple-500/20">
                      <div className="h-2 bg-gradient-to-r from-purple-500/30 to-teal-500/30 rounded mb-2"></div>
                      <div className="flex gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-purple-600/30 rounded"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-1.5 bg-gray-700 rounded"></div>
                          <div className="h-1.5 bg-gray-700 rounded w-3/4"></div>
                          <div className="h-1 bg-gray-800 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 bg-teal-500/10 rounded border border-teal-500/20"></div>
                        <div className="h-8 bg-purple-500/10 rounded border border-purple-500/20"></div>
                      </div>
                    </div>
                    {/* Another debate */}
                    <div className="bg-gray-900 rounded p-2">
                      <div className="flex gap-2">
                        <div className="w-6 h-6 bg-teal-500/20 rounded"></div>
                        <div className="flex-1">
                          <div className="h-1 bg-gray-700 rounded mb-1"></div>
                          <div className="h-1 bg-gray-800 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Laptop */}
              <motion.div
                initial={{ opacity: 0, x: 100, rotateZ: 0 }}
                animate={{ opacity: 1, x: 0, rotateZ: -2 }}
                transition={{ duration: 0.8, delay: 1.0, type: 'spring', stiffness: 120 }}
                whileHover={{ scale: 1.05, rotateZ: 0 }}
                className="absolute w-[300px] md:w-[320px] lg:w-[350px] h-[170px] md:h-[185px] lg:h-[200px] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 hidden lg:block"
                style={{
                  top: '52%',
                  left: '45%',
                  zIndex: 10,
                  boxShadow: '0 0 40px rgba(20, 184, 166, 0.5), 0 0 80px rgba(20, 184, 166, 0.3), 0 30px 60px -12px rgba(0, 0, 0, 0.7)',
                  border: '2px solid rgba(20, 184, 166, 0.4)',
                }}
              >
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[280px] md:w-[300px] lg:w-[330px] h-[130px] md:h-[145px] lg:h-[160px] bg-gray-950 rounded-lg overflow-hidden">
                  <div className="p-4 space-y-3">
                    {/* Challenge Header */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-teal-400">Challenge</div>
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                      </div>
                    </div>
                    {/* Challenge card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 border border-teal-500/30">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500/30 to-teal-600/30 rounded-lg flex items-center justify-center border border-teal-500/40">
                          <div className="w-6 h-6 border-2 border-teal-400 rounded"></div>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-700 rounded w-32 mb-1.5"></div>
                          <div className="h-1.5 bg-gray-800 rounded w-24"></div>
                        </div>
                        <div className="text-2xl font-bold text-teal-400">7/10</div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-10 bg-teal-500/20 rounded border border-teal-500/30"></div>
                        ))}
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="bg-gray-900 rounded-full h-2 overflow-hidden">
                      <div className="h-full w-3/4 bg-gradient-to-r from-teal-500 to-purple-500"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative pt-16 pb-10">
        <div className="w-full px-4 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Debates */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{
                scale: 1.03,
                y: -6,
                boxShadow: "0 0 30px rgba(20, 184, 166, 0.4), 0 20px 40px -10px rgba(0, 0, 0, 0.5)"
              }}
              className="bg-gray-900/60 backdrop-blur-sm border border-teal-500/30 rounded-xl p-4 transition-all duration-300 hover:border-teal-500/50 hover:bg-gray-900/70 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl flex-shrink-0">💬</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Debates</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Engage in lively arguments and voice your opinions.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Social */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{
                scale: 1.03,
                y: -6,
                boxShadow: "0 0 30px rgba(139, 92, 246, 0.4), 0 20px 40px -10px rgba(0, 0, 0, 0.5)"
              }}
              className="bg-gray-900/60 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 transition-all duration-300 hover:border-purple-500/50 hover:bg-gray-900/70 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl flex-shrink-0">📱</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Social</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Share posts, react to content and build connections.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Profile */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={{
                scale: 1.03,
                y: -6,
                boxShadow: "0 0 30px rgba(20, 184, 166, 0.4), 0 20px 40px -10px rgba(0, 0, 0, 0.5)"
              }}
              className="bg-gray-900/60 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4 transition-all duration-300 hover:border-cyan-500/50 hover:bg-gray-900/70 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl flex-shrink-0">👤</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Profile</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Showcase your identity and track your engagement.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Hashtags */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              whileHover={{
                scale: 1.03,
                y: -6,
                boxShadow: "0 0 30px rgba(139, 92, 246, 0.4), 0 20px 40px -10px rgba(0, 0, 0, 0.5)"
              }}
              className="bg-gray-900/60 backdrop-blur-sm border border-orange-500/30 rounded-xl p-4 transition-all duration-300 hover:border-orange-500/50 hover:bg-gray-900/70 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="text-4xl flex-shrink-0">#️⃣</div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">Hashtags</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Discover trending topics and join conversations.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

    </div>
  );
}

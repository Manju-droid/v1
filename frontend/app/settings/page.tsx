'use client';

import React from 'react';
import Link from 'next/link';
import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { RightSidebar } from '@/components/feed/RightSidebar';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
      <div className="relative">
        <LeftNav />
        
        <main className="lg:ml-[72px] xl:mr-[340px] min-h-screen">
          <div className="max-w-[720px] mx-auto px-4 py-6 pb-24 lg:pb-6">
            <div className="bg-gray-900/60 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
              <p className="text-gray-400 mb-6">
                This feature is coming soon. Manage your account and preferences.
              </p>
              <Link
                href="/feed"
                className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-shadow"
              >
                Back to Feed
              </Link>
            </div>
          </div>
        </main>
        
        <RightSidebar />
        <MobileNav />
      </div>
    </div>
  );
}


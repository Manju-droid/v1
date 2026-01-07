'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { LeftNav } from '@/components/feed/LeftNav';
import { MobileNav } from '@/components/feed/MobileNav';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { RightSidebar } from '@/components/feed/RightSidebar';

const CATEGORIES = [
    'Politics',
    'Entertainment',
    'Technology',
    'Sports',
    'Education',
    'General',
];

export default function CreateCommunityPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        imageUrl: '',
        bannerUrl: '',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // In a real app, we would get the token from a context or storage
    // For this mock/demo, we assume the backend handles auth via cookie or we mock it
    // But wait, the backend endpoint expects specific headers maybe?
    // The layout usually handles auth context. We'll rely on fetch wrapping or simple token if available.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!formData.category) {
            setError('Please select a category');
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch('http://localhost:8080/api/communities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token || 'demo-token'}`, // Mock token handling
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt || 'Failed to create community');
            }

            router.push('/communities');
        } catch (err: any) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0C1117] text-[#E6EAF0]">
            <div className="relative">
                <FeedHeader />
                <LeftNav />

                <main className="lg:ml-[72px] xl:mr-[340px] min-h-screen pt-16">
                    <div className="max-w-[600px] mx-auto px-4 py-8 pb-24 lg:pb-8">
                        <div className="bg-gray-900/40 rounded-2xl p-8 border border-white/5 backdrop-blur-sm shadow-xl">
                            <h1 className="text-2xl font-bold text-white mb-2">Create a Community</h1>
                            <p className="text-gray-400 mb-8 text-sm">Build a space for people to discuss and share content about a specific topic.</p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Community Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-gray-600"
                                        placeholder="e.g. Tech Enthusiasts"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-gray-600 h-32 resize-none"
                                        placeholder="What is this community about?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Category
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: cat })}
                                                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${formData.category === cat
                                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                                                    : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-300'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Select the category that best fits your community.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Image URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-gray-600"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>

                                <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.back()}
                                        className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                                    >
                                        {submitting ? 'Creating...' : 'Create Community'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                <RightSidebar />
                <MobileNav />
            </div>
        </div>
    );
}

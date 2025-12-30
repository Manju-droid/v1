'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateUserProfile, UserProfile } from '../stores/profileAPI';
import { AvatarUpload } from './AvatarUpload';
import { getAvatarUrl } from '@/lib/avatar';

// Re-defining interface locally to avoid circular deps if needed, 
// or import from a shared types file
interface EditProfileModalProps {
    user: {
        id: string;
        name: string;
        handle: string;
        email?: string;
        bio: string;
        gender?: string;
        avatarUrl: string;
        coverPhotoUrl?: string;
    };
    onClose: () => void;
    onUpdate: (data?: any) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onUpdate }) => {
    const [name, setName] = useState(user.name);
    const [handle, setHandle] = useState(user.handle);
    const [email, setEmail] = useState(user.email || ''); // Assuming email passed in user
    const [bio, setBio] = useState(user.bio || '');
    const [gender, setGender] = useState(user.gender || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (password && password !== confirmPassword) {
                setError('Passwords do not match');
                setIsSubmitting(false);
                return;
            }

            // If selecting a gender and using a default avatar (ui-avatars or dicebear avataaars),
            // clear the avatarUrl so the new Ghibli one (DiceBear adventurer) takes over dynamically.
            let avatarUrlToSave = user.avatarUrl;
            if (gender && (user.avatarUrl.includes('ui-avatars.com') || user.avatarUrl.includes('avataaars'))) {
                avatarUrlToSave = '';
            }

            await updateUserProfile({
                name,
                handle,
                email,
                bio,
                gender,
                avatarUrl: avatarUrlToSave,
                password: password || undefined,
            }, user.id);
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Failed to update profile:', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-gray-900 border border-white/[0.1] rounded-2xl shadow-xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-800">
                            {/* Show current (potentially updated) avatar */}
                            <img
                                src={user.avatarUrl || getAvatarUrl({ ...user, gender: gender || (user as any).gender })}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Profile Photo
                            </label>
                            <AvatarUpload
                                currentAvatar={user.avatarUrl}
                                onAvatarChange={(newUrl) => {
                                    // Propagate change up immediately as it is already saved to backend
                                    onUpdate({ avatarUrl: newUrl });
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                            Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                            placeholder="Your name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="handle" className="block text-sm font-medium text-gray-300">
                            Handle
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-2 text-gray-500">@</span>
                            <input
                                type="text"
                                id="handle"
                                value={handle}
                                onChange={(e) => setHandle(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                                placeholder="handle"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-300">
                            Gender
                        </label>
                        <select
                            id="gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer"
                        >
                            <option value="" className="bg-gray-900 text-gray-400">Select gender</option>
                            <option value="male" className="bg-gray-900">Male</option>
                            <option value="female" className="bg-gray-900">Female</option>
                            <option value="other" className="bg-gray-900">Non-binary / Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                            placeholder="Email address"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                            New Password (Optional)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                            placeholder="Leave blank to keep current"
                        />
                    </div>

                    {password && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                                placeholder="Confirm new password"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-300">
                            Bio
                        </label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-black/20 border border-white/[0.1] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600 resize-none"
                            placeholder="Tell us about yourself"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

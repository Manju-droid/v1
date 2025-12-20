'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { debateAPI } from '@v/api-client';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth';

interface CreateDebateFormProps {
    onClose?: () => void;
}

export const CreateDebateForm: React.FC<CreateDebateFormProps> = ({ onClose }) => {
    const router = useRouter();
    const { addToast } = useToast();
    const { currentUser, syncCurrentUser } = useStore();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // Sync current user when authenticated
    useEffect(() => {
        if (isAuthenticated && !currentUser && !authLoading) {
            console.log('[CreateDebateForm] User authenticated but currentUser not set, syncing...');
            syncCurrentUser();
        }
    }, [isAuthenticated, currentUser, authLoading, syncCurrentUser]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
        startTimeOption: 'now' as 'now' | 'schedule',
        scheduledTime: '',
        duration: 60, // default 1 hour
        category: 'Technology',
        showInPulse: true,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const categories = [
        'Technology',
        'Politics',
        'Lifestyle',
        'Education',
        'Sports',
        'Entertainment',
        'Science',
        'Other',
    ];

    const durations = [
        { label: '30 minutes', value: 30 },
        { label: '1 hour', value: 60 },
        { label: '6 hours', value: 360 },
        { label: '24 hours', value: 1440 },
    ];

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Topic is required';
        } else if (formData.title.length > 100) {
            newErrors.title = 'Topic must be 100 characters or less';
        }

        if (formData.startTimeOption === 'schedule') {
            if (!formData.scheduledTime) {
                newErrors.scheduledTime = 'Please select a start time';
            } else {
                const selectedTime = new Date(formData.scheduledTime);
                if (selectedTime <= new Date()) {
                    newErrors.scheduledTime = 'Start time must be in the future';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Check if user is authenticated
            if (!currentUser?.id) {
                addToast('Please log in to create a debate', 'error');
                setIsSubmitting(false);
                return;
            }

            // Determine start time
            const startTime = formData.startTimeOption === 'now'
                ? new Date().toISOString()
                : new Date(formData.scheduledTime).toISOString();

            // Create debate
            const debate = await debateAPI.create({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                hostId: currentUser.id,
                type: formData.type,
                startTime,
                durationMinutes: formData.duration,
                showInPulse: formData.type === 'PUBLIC' ? formData.showInPulse : false,
            });

            addToast('Debate created successfully!', 'success');

            if (onClose) {
                onClose();
            }

            // Navigate to the debate page
            router.push(`/debates/${debate.id}`);
        } catch (error: any) {
            console.error('Failed to create debate:', error);
            addToast(error.message || 'Failed to create debate', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                    Topic <span className="text-red-400">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={100}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="What's the debate about?"
                />
                {errors.title && (
                    <p className="mt-1 text-sm text-red-400">{errors.title}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{formData.title.length}/100 characters</p>
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    Description (Optional)
                </label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    placeholder="Provide more context about this debate..."
                />
            </div>

            {/* Debate Type */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Debate Type <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="type"
                            value="PUBLIC"
                            checked={formData.type === 'PUBLIC'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PUBLIC' })}
                            className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 focus:ring-cyan-500"
                        />
                        <span className="ml-2 text-gray-300">Public</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="type"
                            value="PRIVATE"
                            checked={formData.type === 'PRIVATE'}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PRIVATE' })}
                            className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 focus:ring-cyan-500"
                        />
                        <span className="ml-2 text-gray-300">Private (Followers only)</span>
                    </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                    {formData.type === 'PUBLIC'
                        ? 'Anyone can see and join this debate'
                        : 'Only your followers can see and join this debate'}
                </p>
            </div>

            {/* Start Time */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Time <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="startTimeOption"
                            value="now"
                            checked={formData.startTimeOption === 'now'}
                            onChange={(e) => setFormData({ ...formData, startTimeOption: e.target.value as 'now' })}
                            className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 focus:ring-cyan-500"
                        />
                        <span className="ml-2 text-gray-300">Start Now</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="startTimeOption"
                            value="schedule"
                            checked={formData.startTimeOption === 'schedule'}
                            onChange={(e) => setFormData({ ...formData, startTimeOption: e.target.value as 'schedule' })}
                            className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 focus:ring-cyan-500"
                        />
                        <span className="ml-2 text-gray-300">Schedule for Later</span>
                    </label>

                    {formData.startTimeOption === 'schedule' && (
                        <div className="ml-6">
                            <input
                                type="datetime-local"
                                value={formData.scheduledTime}
                                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                            {errors.scheduledTime && (
                                <p className="mt-1 text-sm text-red-400">{errors.scheduledTime}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Duration */}
            <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-300 mb-2">
                    Duration <span className="text-red-400">*</span>
                </label>
                <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                    {durations.map((d) => (
                        <option key={d.value} value={d.value}>
                            {d.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Category */}
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                    Category (Optional)
                </label>
                <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Show in Pulse */}
            {formData.type === 'PUBLIC' && (
                <div>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.showInPulse}
                            onChange={(e) => setFormData({ ...formData, showInPulse: e.target.checked })}
                            className="w-4 h-4 text-cyan-500 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500"
                        />
                        <span className="ml-2 text-gray-300">Show in Pulse</span>
                    </label>
                    <p className="mt-1 ml-6 text-xs text-gray-500">
                        Allow this debate to be featured in the Pulse feed
                    </p>
                </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating...' : 'Create Debate'}
                </button>
            </div>
        </form>
    );
};

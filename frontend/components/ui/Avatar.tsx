'use client';

import React from 'react';

import { getAvatarUrl } from '@/lib/avatar';

interface AvatarProps {
    user: {
        id?: string;
        avatar?: string;
        avatarUrl?: string; // Support both naming conventions
        handle?: string;
        name?: string;
        displayName?: string; // Support both naming conventions
        gender?: string;
    };
    size?: 'sm' | 'md' | 'lg' | 'xl' | number | string;
    className?: string; // Additional classes for the container
    imageClassName?: string; // Additional classes for the image itself
    showBorder?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
    user,
    size = 'md',
    className = '',
    imageClassName = '',
    showBorder = false
}) => {
    // Normalize user object for getAvatarUrl
    const userForAvatar = {
        id: user.id,
        avatarUrl: user.avatar || user.avatarUrl,
        gender: user.gender,
        handle: user.handle,
        name: user.displayName || user.name
    };

    const avatarUrl = getAvatarUrl(userForAvatar);

    // Determine dimensions based on size prop
    let width: number | string = 40;
    let height: number | string = 40;

    if (typeof size === 'number') {
        width = size;
        height = size;
    } else if (typeof size === 'string' && !['sm', 'md', 'lg', 'xl'].includes(size)) {
        // Custom string size (e.g. "100%")
        width = size;
        height = size;
    } else {
        switch (size) {
            case 'sm': width = 32; height = 32; break; // w-8 h-8
            case 'md': width = 40; height = 40; break; // w-10 h-10
            case 'lg': width = 48; height = 48; break; // w-12 h-12
            case 'xl': width = 80; height = 80; break; // w-20 h-20
        }
    }

    const [imageError, setImageError] = React.useState(false);

    // Reset error state if url changes
    React.useEffect(() => {
        setImageError(false);
    }, [avatarUrl]);

    return (
        <div
            className={`relative rounded-full overflow-hidden flex-shrink-0 bg-gray-800 flex items-center justify-center ${showBorder ? 'ring-2 ring-cyan-500/20' : ''} ${className}`}
            style={{ width, height }}
        >
            {!imageError ? (
                <img
                    src={avatarUrl}
                    alt={user.displayName || user.name || 'User'}
                    className={`object-cover w-full h-full ${imageClassName}`}
                    onError={(e) => {
                        console.error('Avatar image failed to load:', avatarUrl);
                        setImageError(true);
                    }}
                />
            ) : (
                <span className="text-gray-400 font-bold" style={{ fontSize: typeof height === 'number' ? height * 0.4 : '1rem' }}>
                    {(user.displayName || user.name || 'U').charAt(0).toUpperCase()}
                </span>
            )}
        </div>
    );
};

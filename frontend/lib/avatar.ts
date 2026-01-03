import { getEmojiAvatarUri } from './emoji-avatars';

/**
 * Helper to get the correct avatar URL for a user
 * 
 * Logic:
 * 1. If user has an explicit custom avatarUrl set (uploaded image), use it.
 * 2. Otherwise, generate emoji avatar based on age and gender.
 * 3. Fallback to default emoji if no user data available.
 */

export const getAvatarUrl = (user: {
    avatarUrl?: string;
    gender?: string;
    handle?: string;
    name?: string;
    id?: string;
}): string => {
    // Check if user has a custom uploaded avatar (not a generated one)
    // We consider it custom if it's not a data URI (our emoji avatars start with 'data:')
    const isCustomAvatar = user.avatarUrl && !user.avatarUrl.startsWith('data:');

    if (isCustomAvatar) {
        return user.avatarUrl!;
    }

    // Generate emoji avatar based on user's gender
    return getEmojiAvatarUri({
        id: user.id,
        handle: user.handle,
        gender: user.gender
    });
};

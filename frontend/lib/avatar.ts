
/**
 * Helper to get the correct avatar URL for a user
 * 
 * Logic:
 * 1. If user has an explicit avatarUrl set (that isn't a default DiceBear one), use it.
 * 2. If user has a gender set, use the 'adventurer' style (Ghibli-esque) with gender-appropriate seed/options.
 * 3. Fallback to initials or generic avatar.
 */

export const getAvatarUrl = (user: {
    avatarUrl?: string;
    gender?: string;
    handle?: string;
    name?: string
}): string => {
    // If user has a custom uploaded avatar, use it
    // We check if it's NOT a dicebear URL (unless it's the one we generated)
    // or if it's a blob/data URL from local upload
    if (user.avatarUrl && !user.avatarUrl.includes('api.dicebear.com')) {
        return user.avatarUrl;
    }

    // If we have a gender, generate a specific Ghibli-style (adventurer) avatar
    if (user.gender) {
        const seed = user.handle || user.name || 'user';
        // 'adventurer' style is great for Ghibli vibes
        // We can tweak parameters based on gender if needed, but the style is generally unisex/customizable
        // For now, we'll just use the seed. 
        // If we wanted specific gender traits, we might add `&gender=${user.gender}` if the API supported it,
        // but DiceBear mostly relies on the seed or specific sprite collections.

        // However, 'adventurer' doesn't have explicit gender query params.
        // 'adventurer-neutral' is another option.
        // Let's just use the seed which usually gives good variety.

        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
    }

    // Fallback if no gender or custom avatar: use existing avatarUrl or generate generic one
    if (user.avatarUrl) return user.avatarUrl;

    // Ultimate fallback
    const seed = user.handle || user.name || 'user';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;
};

/**
 * Users Feature Module
 * 
 * Central export file for users feature.
 */

// Components
export { AvatarUpload } from './components/AvatarUpload';
export { CoverPhotoUpload } from './components/CoverPhotoUpload';
export { FollowersModal } from './components/FollowersModal';
export { FollowingModal } from './components/FollowingModal';
export { EditProfileModal } from './components/EditProfileModal';

// Stores
export { useUserStore, type UserTier, type UserPoints } from './stores/user-store';
export * from './stores/profileAPI';


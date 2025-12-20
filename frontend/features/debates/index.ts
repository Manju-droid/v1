/**
 * Debates Feature Module
 * 
 * Central export file for debates feature.
 * Import from '@features/debates' or '@/features/debates'
 */

// Components
export { CreateDebateForm } from './components/CreateDebateForm';
export { DebateCard } from './components/DebateCard';
export { DebateCarousel } from './components/DebateCarousel';
export { JoinDebateModal } from './components/JoinDebateModal';
export { MicrophonePermissionModal } from './components/MicrophonePermissionModal';
export { QuickStats } from './components/QuickStats';
export { UserOptionsModal } from './components/UserOptionsModal';

// Hooks
export { useDebateWebRTC, type DebateRole, type PeerInfo } from './hooks/useDebateWebRTC';
export { useSignaling } from './hooks/useSignaling';

// Stores
export { useDebateStore } from './stores/debate-store';
export { useDebateRoomStore, type Participant, type SpeakRequest, type DebateRoomState } from './stores/debate-room-store';

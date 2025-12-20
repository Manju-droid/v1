# Mobile vs Web UI & Features Comparison

## Current Status

### ✅ **Features are the same** (Core functionality)
- All API endpoints are shared via `@v/api-client`
- All business logic is shared via `@v/shared`
- Same data models and validation

### ⚠️ **UI is similar but not identical** (Platform differences)

## UI Differences

### Design System
- **Web**: HTML/CSS with Tailwind CSS, Next.js components
- **Mobile**: React Native with StyleSheet, native components
- **Colors & Theme**: ✅ Same dark theme (#0C1117 background, cyan accents)
- **Layout**: Different (web has sidebars, mobile is full-screen)

### Component Differences
- **Web**: Uses `<div>`, `<button>`, Next.js `<Image>`
- **Mobile**: Uses `<View>`, `<TouchableOpacity>`, React Native `<Image>`
- **Navigation**: Web uses Next.js Router, Mobile uses Expo Router

## Feature Comparison

### Debates Feature

#### ✅ Implemented in Both
- List debates
- Filter by status (All, Active, Scheduled, Ended)
- View debate details
- Join debate (Agree/Disagree)
- Create debate
- View participants
- View stats (agree/disagree counts)

#### ⚠️ Web Only (Missing in Mobile)
- **WebSocket real-time updates** (debate creation, status changes)
- **DebateCarousel** component (carousel view)
- **QuickStats** sidebar component
- **Register/Unregister** for scheduled debates (with notifications)
- **Delete debate** functionality
- **Auto-refresh** every 30 seconds
- **Points checking** (canHostDebate validation)
- **Debate stats page** (separate stats view)
- **Live debate room** with WebRTC/LiveKit audio

### Messages Feature

#### ✅ Implemented in Both
- List conversations
- View chat thread
- Send messages
- Message timestamps

#### ⚠️ Web Only (Missing in Mobile)
- **Typing indicators** ("typing..." status)
- **Unread message counts** (badge on conversations)
- **Online status** indicators
- **Last message preview** in list
- **Compose new message** button
- **Real-time message updates** (WebSocket)

### Profile Feature

#### ✅ Implemented in Both
- View profile
- Follow/Unfollow
- View stats (Posts, Followers, Following)
- Points display
- Tabs (Posts, Replies, Media)

#### ⚠️ Web Only (Missing in Mobile)
- **Edit profile** functionality
- **Avatar upload**
- **Cover photo upload**
- **Followers modal** (view followers list)
- **Following modal** (view following list)
- **Saved posts** tab
- **User posts list** (actual posts display)
- **Followers-only comments** toggle

## Missing Advanced Features in Mobile

### 1. Real-time Updates
- **Web**: WebSocket connections for live updates
- **Mobile**: Polling-based (refresh on pull-to-refresh)
- **Impact**: Mobile doesn't get instant updates

### 2. Live Debate Room
- **Web**: Full WebRTC/LiveKit integration with audio streaming
- **Mobile**: Basic join functionality only
- **Impact**: Mobile can't participate in live audio debates

### 3. Advanced UI Components
- **Web**: Carousels, modals, complex layouts
- **Mobile**: Simplified list views
- **Impact**: Different visual experience

### 4. Native Features
- **Mobile**: Can add push notifications, camera, etc.
- **Web**: Browser-based features only
- **Impact**: Mobile can have unique native capabilities

## Recommendations

### Option 1: Keep Mobile Simplified (Current)
- ✅ Faster development
- ✅ Easier to maintain
- ✅ Core features work
- ❌ Missing some advanced features

### Option 2: Add Missing Features to Mobile
- ✅ Feature parity with web
- ✅ Better user experience
- ❌ More development time
- ❌ More complex codebase

### Option 3: Hybrid Approach
- ✅ Add critical features (real-time updates, live debate room)
- ✅ Keep UI simplified for mobile
- ✅ Best of both worlds

## Next Steps

If you want feature parity, I can add:
1. **WebSocket support** for real-time updates
2. **Live debate room** with WebRTC (requires native modules)
3. **Advanced UI components** (carousels, modals)
4. **Missing profile features** (edit, uploads, modals)
5. **Enhanced messages** (typing, unread counts)

Would you like me to add these missing features to match the web app?

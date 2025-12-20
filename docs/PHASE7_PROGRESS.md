# Phase 7: Frontend Feature Modules - Progress

## Status: IN PROGRESS

## Completed: Debates Feature Migration ✅

### Files Moved

**Hooks:**
- `hooks/useDebateWebRTC.ts` → `features/debates/hooks/useDebateWebRTC.ts`
- `hooks/useSignaling.ts` → `features/debates/hooks/useSignaling.ts`

**Stores:**
- `lib/debate-store.ts` → `features/debates/stores/debate-store.ts`
- `lib/debate-room-store.ts` → `features/debates/stores/debate-room-store.ts`

**Components:**
- `components/debates/*` → `features/debates/components/*`
  - CreateDebateForm.tsx
  - DebateCard.tsx
  - DebateCarousel.tsx
  - JoinDebateModal.tsx
  - MicrophonePermissionModal.tsx
  - QuickStats.tsx
  - UserOptionsModal.tsx

### Index Files Created

- `features/debates/index.ts` - Main export file
- `features/debates/hooks/index.ts` - Hooks exports
- `features/debates/stores/index.ts` - Stores exports
- `features/debates/components/index.ts` - Components exports

### Imports Updated

- `app/debates/[id]/page.tsx` - Updated to use `@/features/debates`
- `app/debates/page.tsx` - Updated to use `@/features/debates`
- `app/debates/create/page.tsx` - Updated to use `@/features/debates`
- `app/hashtag/page.tsx` - Updated to use `@/features/debates`
- `features/debates/components/DebateCard.tsx` - Updated internal imports

### New Import Pattern

```typescript
// Before
import { useDebateStore } from '@/lib/debate-store';
import { useDebateWebRTC } from '@/hooks/useDebateWebRTC';
import { DebateCard } from '@/components/debates/DebateCard';

// After
import { useDebateStore, useDebateWebRTC, DebateCard } from '@/features/debates';
```

## Completed: Posts Feature Migration ✅

### Files Moved

**Components:**
- `components/post/*` → `features/posts/components/*`
  - CommentItem.tsx
  - PostHeader.tsx
  - PostSkeleton.tsx
  - QuoteModal.tsx
  - ReportButton.tsx
- `components/feed/PostCard.tsx` → `features/posts/components/PostCard.tsx`
- `components/feed/Composer.tsx` → `features/posts/components/Composer.tsx`
- `components/feed/QuoteModal.tsx` → `features/posts/components/QuoteModal.tsx`
- `components/feed/Skeleton.tsx` → `features/posts/components/PostSkeleton.tsx`

### Index Files Created

- `features/posts/index.ts` - Main export file
- `features/posts/components/index.ts` - Components exports

### Imports Updated

- `app/feed/page.tsx` - Updated to use `@/features/posts`
- `app/post/[id]/page.tsx` - Updated to use `@/features/posts`
- `app/search/page.tsx` - Updated to use `@/features/posts`
- `app/hashtag/[slug]/page.tsx` - Updated to use `@/features/posts`
- `app/u/[handle]/page.tsx` - Updated to use `@/features/posts`
- `app/feed/@modal/(.)post/[id]/page.tsx` - Updated to use `@/features/posts`
- `features/posts/components/PostCard.tsx` - Updated internal imports
- `features/posts/components/CommentItem.tsx` - Updated internal imports

## Remaining Features to Migrate

### 1. Posts Feature ✅ COMPLETE

### 2. Messages Feature ⏳
- Components: (if any)
- Hooks: (if any)
- Stores: (if any)

### 3. Auth Feature ⏳
- Components: `components/AuthCard.tsx`
- Hooks: `hooks/useAuth.ts`
- Stores: (if any)

### 4. Users Feature ⏳
- Components: `components/profile/*`
- Hooks: (if any)
- Stores: `lib/user-store.ts`, `lib/profileAPI.ts`

### 5. Moderation Feature ⏳
- Components: (if any)
- Hooks: (if any)
- Stores: (if any)

## Directory Structure Created

```
frontend/
├── features/
│   ├── debates/          ✅ COMPLETE
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── index.ts
│   ├── posts/           ✅ COMPLETE
│   ├── messages/         ⏳ TODO
│   ├── auth/             ⏳ TODO
│   ├── users/            ⏳ TODO
│   └── moderation/       ⏳ TODO
├── components/           (shared components remain)
└── lib/                  (shared utilities remain)
```

## Benefits Achieved

1. ✅ **Better Organization** - All debate code in one place
2. ✅ **Easier to Find** - Know where to look for debate code
3. ✅ **Cleaner Imports** - Single import from feature module
4. ✅ **Easier to Maintain** - Update debate feature without touching other code

## Next Steps

1. Continue migrating remaining features (posts, messages, auth, users, moderation)
2. Update all remaining imports
3. Remove deprecated `frontend/lib/api-client.ts` after all migrations
4. Test all features to ensure nothing broke

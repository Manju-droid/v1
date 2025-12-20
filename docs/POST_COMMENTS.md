# Post Detail & Comment System

This document describes the Post Detail and Comment Permalink system implemented in V.

## Routes

### Post Detail: `/post/[id]`
Shows a full post with all comments and an inline composer for new comments.

**Features:**
- Back button returns to previous page with scroll position restored
- Full post display with media, actions, and counts
- Inline composer for top-level comments
- Threaded comments (up to 2 levels deep)
- "View more in thread" for deeply nested comments
- Quote modal integration via URL query `?quote=[id]`

### Comment Permalink: `/post/[id]?c=[commentId]`
Focuses on a specific comment within a post's thread.

**Features:**
- Compact context header showing the original post
- Parent comment breadcrumb if the focused comment is a reply
- Focused comment rendered as primary content with larger text
- Replies to the focused comment shown below
- Quick navigation back to full post view

## Components

### PostHeader (`/components/post/PostHeader.tsx`)
- Post author info chip
- Back button
- Overflow menu
- Sticky on mobile for better UX

### CommentItem (`/components/post/CommentItem.tsx`)
- Avatar, author name, handle, timestamp
- Comment content with click-to-permalink
- Action row: React (Pulse icon), Reply, Share
- Inline reply composer when "Reply" is clicked
- "View more in thread" button for comments with deep replies
- Focused state with larger text and cyan ring
- Thread connectors for nested comments

### PostSkeleton (`/components/post/PostSkeleton.tsx`)
- Loading state for post detail page
- Animated skeleton for header, content, media, actions, and comments

### QuoteModal (`/components/post/QuoteModal.tsx`)
- Modal for quoting posts or comments
- Triggered via URL query: `?quote=[id]`
- Shows composer with quoted content preview
- Closes by removing query param (no page reload)

## Interactions

### From Feed → Post Detail
Click on a post's comment count or comment button → navigate to `/post/[id]`

### Comment Permalink
Click on a comment's body or timestamp → navigate to `/post/[id]?c=[commentId]`

### Share
- **Post:** Copies `{origin}/post/[id]` to clipboard
- **Comment:** Copies `{origin}/post/[id]?c=[commentId]` to clipboard
- Console log confirmation (toast can be added later)

### Quote
Click Quote button → opens modal via `?quote=[id]` query param
Modal closes → removes query without page reload

## Data Structure

### MockComment Interface
```typescript
interface MockComment {
  id: string;
  postId: string;
  parentId: string | null;  // null for top-level comments
  author: MockUser;
  content: string;
  timestamp: Date;
  reactions: number;
  replies: number;
  depth: number;  // 0, 1, or 2 (max depth shown)
}
```

### Mock Data (`/lib/mock.ts`)
- `mockComments`: Record<postId, MockComment[]>
- `getPostById(id)`: Returns post or null
- `getComments(postId)`: Returns all comments for a post
- `getCommentById(postId, commentId)`: Returns specific comment
- `getThreadedComments(postId)`: Returns comments sorted by depth and time

## Responsive Behavior

### Desktop (≥1024px)
- Left nav visible (72px)
- Post centered (max-w 720px)
- Static post header
- All comments visible with threading

### Tablet (768px - 1023px)
- Left nav collapsed to icons
- Post centered with padding
- Comfortable spacing

### Mobile (< 768px)
- Bottom tab bar
- Sticky post header for context
- Single column layout
- Reduced padding and font sizes
- FAB hidden (post from feed page)

## Accessibility

- Keyboard navigable (tab order: Post → Composer → Comments)
- `aria-current="true"` for focused comment
- `aria-label` fallbacks for icon buttons
- Proper heading hierarchy
- Focus rings on interactive elements
- Color contrast AA compliance

## Future Enhancements

### With Backend
- Replace mock data with real API calls
- Real-time comment updates
- Optimistic UI updates
- Comment pagination/infinite scroll
- Notification system for replies
- User blocking/reporting

### Features
- Rich text formatting in comments
- Emoji reactions (beyond just count)
- Comment editing and deletion
- Vote/sort comments (top, new, controversial)
- Collapsible comment threads
- Search within comments
- Deep linking to specific comment positions

## Performance

- Skeleton loaders for perceived performance
- Staggered animations for visual polish
- IntersectionObserver for scroll-to-comment
- Layout shift prevention (fixed action button widths)
- Lazy loading for offscreen content (future)
- Virtualization for large comment lists (future, 100+ comments)

## Design Tokens

- Background: `#0C1117`
- Surface: `#0F1621` / `#111827`
- Text: `#E6EAF0`
- Muted: `#A7B0BE`
- Primary: `#22D3EE` (cyan)
- Accent: `#7C3AED` (purple)
- Border: `white/6%` (inner)
- Shadow: Soft cyan glow on hover
- Focused comment: Cyan ring + larger text

## Testing Checklist

- [x] Navigate to `/post/1` shows post with comments
- [x] Navigate to `/post/1?c=c1-1` focuses that comment
- [x] Back button restores previous view
- [x] Share copies correct permalink
- [x] Quote modal opens via URL query
- [x] "View more in thread" navigates to comment permalink
- [x] Reply composer works (UI-only)
- [x] Responsive on mobile, tablet, desktop
- [x] Keyboard accessible
- [x] Custom icons (Pulse/HexSave) animate correctly
- [x] No horizontal scroll on any screen size
- [x] Protected by middleware (requires login)


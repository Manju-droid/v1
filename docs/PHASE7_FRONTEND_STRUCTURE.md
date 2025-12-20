# Phase 7.3: Frontend Feature Modules - Structure Plan

## Current Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── debates/
│   ├── messages/
│   ├── post/
│   ├── hashtag/
│   ├── search/
│   ├── moderation/
│   └── ...
├── components/             # React components
│   ├── debates/
│   ├── feed/
│   ├── post/
│   └── ...
└── lib/                    # Utilities and stores
    ├── store.ts
    ├── debate-store.ts
    ├── user-store.ts
    └── ...
```

## Proposed Feature-Based Structure

```
frontend/
├── app/                    # Next.js App Router (keep as-is for routing)
│   ├── debates/
│   ├── messages/
│   └── ...
├── features/               # Feature modules (NEW)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── posts/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   ├── debates/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   ├── messages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── users/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   └── moderation/
│       ├── components/
│       └── hooks/
├── components/             # Shared components (keep for now)
│   └── ui/                 # UI primitives
└── lib/                    # Shared utilities (keep)
    ├── api-client.ts       # Legacy (deprecated)
    └── ...
```

## Migration Strategy

1. **Keep app/ directory as-is** - Next.js routing requires this structure
2. **Create features/ directory** - Organize feature-specific code
3. **Gradually move components** - Move feature-specific components to features/
4. **Move stores** - Move feature stores to features/
5. **Update imports** - Update all imports to use new paths

## Benefits

- **Better organization** - All code for a feature in one place
- **Easier to find** - Know where to look for feature code
- **Easier to maintain** - Update feature without touching other code
- **Easier to test** - Test features in isolation
- **Easier to remove** - Delete feature by deleting one folder

## Implementation Notes

- This is a gradual migration - can be done incrementally
- Start with one feature (e.g., debates) as proof of concept
- Update imports as files are moved
- Keep backward compatibility during migration

# V Platform - Architecture Documentation

## Overview

This document describes the new architecture for the V Social Debate Platform, designed to support web, iOS, and Android applications with a clean, maintainable, and scalable codebase.

## Goals

1. **Mobile Support**: Native iOS and Android apps using React Native
2. **Code Reusability**: Shared business logic between web and mobile
3. **Maintainability**: Clean, modular code that new developers can understand
4. **Scalability**: Easy to add features without breaking existing functionality
5. **Zero Downtime Updates**: Update features without stopping the entire app

## New Project Structure

```
V2/
├── packages/
│   ├── shared/                    # Shared business logic (TypeScript)
│   │   ├── domain/                # Domain models & interfaces
│   │   │   ├── user.ts
│   │   │   ├── post.ts
│   │   │   ├── debate.ts
│   │   │   └── index.ts
│   │   ├── services/              # Business logic services
│   │   │   ├── auth.service.ts
│   │   │   ├── post.service.ts
│   │   │   ├── debate.service.ts
│   │   │   └── index.ts
│   │   ├── utils/                 # Shared utilities
│   │   │   ├── validation.ts
│   │   │   ├── formatting.ts
│   │   │   └── index.ts
│   │   ├── constants/             # Shared constants
│   │   │   └── index.ts
│   │   ├── types/                 # Shared TypeScript types
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api-client/                # API client (shared)
│   │   ├── client.ts              # Base HTTP client
│   │   ├── endpoints/             # API endpoints
│   │   │   ├── auth.api.ts
│   │   │   ├── post.api.ts
│   │   │   ├── debate.api.ts
│   │   │   └── index.ts
│   │   ├── types.ts               # API types
│   │   └── package.json
│   │
│   ├── web/                        # Next.js web application
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (features)/         # Feature-based routes
│   │   │   │   ├── auth/
│   │   │   │   ├── posts/
│   │   │   │   ├── debates/
│   │   │   │   └── messages/
│   │   │   └── layout.tsx
│   │   ├── components/             # React components
│   │   │   ├── shared/             # Shared components
│   │   │   └── features/           # Feature-specific components
│   │   ├── hooks/                  # React hooks
│   │   ├── lib/                    # Web-specific utilities
│   │   └── package.json
│   │
│   └── mobile/                     # React Native app (Expo)
│       ├── app/                    # Expo Router
│       ├── components/             # React Native components
│       ├── screens/                # Screen components
│       ├── navigation/              # Navigation setup
│       ├── hooks/                  # React hooks
│       └── package.json
│
├── backend/                        # Go backend API (unchanged)
│   ├── cmd/
│   ├── internal/
│   └── go.mod
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md
│   ├── MIGRATION_PLAN.md
│   └── ...
│
├── scripts/                        # Build and deployment scripts
│   ├── setup.sh                   # Initial setup script
│   └── build-all.sh               # Build all packages
│
├── package.json                    # Root package.json (workspace)
└── README.md
```

## Architecture Principles

### 1. Feature-Based Organization

Each feature is self-contained with its own:
- Domain models
- Services (business logic)
- API client methods
- UI components (platform-specific)
- State management

**Example - Debate Feature:**
```
packages/
├── shared/
│   └── domain/
│       └── debate.ts              # Debate domain model
├── shared/
│   └── services/
│       └── debate.service.ts      # Debate business logic
├── api-client/
│   └── endpoints/
│       └── debate.api.ts          # API calls
├── web/
│   └── app/(features)/debates/    # Web UI
└── mobile/
    └── screens/
        └── DebatesScreen.tsx      # Mobile UI
```

### 2. Separation of Concerns

- **Domain Layer** (`shared/domain`): Pure TypeScript interfaces and types
- **Service Layer** (`shared/services`): Business logic (platform-agnostic)
- **API Layer** (`api-client`): HTTP communication
- **UI Layer** (`web/` or `mobile/`): Platform-specific presentation

### 3. Dependency Flow

```
UI (web/mobile) 
  → API Client 
    → Services (shared)
      → Domain Models (shared)
```

**Rules:**
- UI can only import from `api-client` and `shared`
- `api-client` can only import from `shared`
- `shared` cannot import from UI or `api-client`
- No circular dependencies

### 4. Shared Code Strategy

**What to Share:**
- ✅ Domain models and types
- ✅ Business logic and validation
- ✅ API client
- ✅ Utility functions
- ✅ Constants

**What NOT to Share:**
- ❌ UI components (platform-specific)
- ❌ Navigation/routing
- ❌ Platform-specific APIs (camera, notifications, etc.)
- ❌ Styling (CSS vs React Native StyleSheet)

## Technology Stack

### Web
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **UI**: React 19

### Mobile
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State**: Zustand (shared with web)
- **UI**: React Native components

### Shared
- **Language**: TypeScript
- **Package Manager**: npm workspaces
- **Build Tool**: TypeScript compiler

### Backend
- **Language**: Go 1.21+
- **Router**: Chi
- **Storage**: In-memory (can be upgraded to database)

## Feature Module Structure

Each feature follows this structure:

```
feature-name/
├── domain/
│   └── types.ts                  # Domain types
├── services/
│   └── feature.service.ts        # Business logic
├── api/
│   └── feature.api.ts            # API endpoints
├── hooks/                         # React hooks (if needed)
└── README.md                      # Feature documentation
```

## Benefits

1. **Easy to Understand**: Clear structure, new developers can navigate easily
2. **Easy to Update**: Add features without touching existing code
3. **No Downtime**: Update individual features independently
4. **Code Reuse**: Share business logic between web and mobile
5. **Type Safety**: TypeScript across all layers
6. **Testable**: Each layer can be tested independently

## Migration Strategy

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for detailed step-by-step migration guide.

## Next Steps

1. ✅ Phase 1: Architecture Documentation (this file)
2. ⏳ Phase 2: Foundation Setup (shared code structure)
3. ⏳ Phase 3: Proof of Concept (refactor one feature)
4. ⏳ Phase 4: Mobile Setup (React Native/Expo)
5. ⏳ Phase 5: Incremental Migration (migrate remaining features)

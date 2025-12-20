# Migration Plan - V Platform Refactoring

This document provides a step-by-step guide to migrate from the current structure to the new modular architecture.

## Migration Phases

### Phase 1: Planning and Documentation ✅
- [x] Create architecture documentation
- [x] Create migration plan
- [x] Document current structure

### Phase 2: Foundation Setup ⏳
- [ ] Create monorepo structure
- [ ] Set up npm workspaces
- [ ] Create `packages/shared` directory
- [ ] Create `packages/api-client` directory
- [ ] Set up TypeScript configuration
- [ ] Create base domain models

### Phase 3: Proof of Concept ✅
- [x] Choose a simple feature to refactor (Notifications)
- [x] Extract domain models to `shared/domain`
- [x] Extract business logic to `shared/services`
- [x] Extract API calls to `api-client`
- [x] Update web app to use new structure
- [x] Test and verify

### Phase 4: Mobile Setup ✅
- [x] Initialize React Native/Expo project
- [x] Set up Expo Router
- [x] Configure shared code imports
- [x] Create basic navigation
- [x] Test mobile app with shared code

### Phase 5: Incremental Migration
- [ ] Migrate authentication feature
- [ ] Migrate posts feature
- [ ] Migrate debates feature
- [ ] Migrate messages feature
- [ ] Migrate remaining features
- [ ] Remove old code

## Detailed Steps

### Phase 2: Foundation Setup

#### Step 1: Create Monorepo Structure

```bash
# Create packages directory
mkdir -p packages/shared packages/api-client packages/web packages/mobile

# Create subdirectories
mkdir -p packages/shared/{domain,services,utils,constants,types}
mkdir -p packages/api-client/{endpoints}
```

#### Step 2: Set Up Root Package.json

Create root `package.json` with workspaces:

```json
{
  "name": "v-platform",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:web": "npm run dev --workspace=packages/web",
    "dev:mobile": "npm run dev --workspace=packages/mobile",
    "build:shared": "npm run build --workspace=packages/shared",
    "build:api-client": "npm run build --workspace=packages/api-client",
    "build:web": "npm run build --workspace=packages/web",
    "build:all": "npm run build:shared && npm run build:api-client && npm run build:web"
  }
}
```

#### Step 3: Create Shared Package

**packages/shared/package.json:**
```json
{
  "name": "@v/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**packages/shared/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Step 4: Create API Client Package

**packages/api-client/package.json:**
```json
{
  "name": "@v/api-client",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@v/shared": "*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Phase 3: Proof of Concept

#### Step 1: Choose Feature
Start with a simple feature like **Notifications** or **Hashtags**.

#### Step 2: Extract Domain Model

**packages/shared/src/domain/notification.ts:**
```typescript
export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  message: string;
  read: boolean;
  createdAt: Date;
}
```

#### Step 3: Extract Service

**packages/shared/src/services/notification.service.ts:**
```typescript
import { Notification } from '../domain/notification';

export class NotificationService {
  static markAsRead(notification: Notification): Notification {
    return { ...notification, read: true };
  }
  
  static formatMessage(notification: Notification): string {
    // Business logic here
    return notification.message;
  }
}
```

#### Step 4: Extract API Client

**packages/api-client/src/endpoints/notification.api.ts:**
```typescript
import { Notification } from '@v/shared';
import { apiClient } from '../client';

export const notificationAPI = {
  list: () => apiClient.get<Notification[]>('/notifications'),
  markAsRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
};
```

#### Step 5: Update Web App

**packages/web/app/(features)/notifications/page.tsx:**
```typescript
import { notificationAPI } from '@v/api-client';
import { NotificationService } from '@v/shared';

// Use the shared code
```

### Phase 4: Mobile Setup

#### Step 1: Initialize Expo Project

```bash
cd packages/mobile
npx create-expo-app@latest . --template blank-typescript
```

#### Step 2: Install Dependencies

```bash
npm install @v/shared @v/api-client
npm install @react-navigation/native expo-router
```

#### Step 3: Create Mobile Screens

**packages/mobile/app/notifications.tsx:**
```typescript
import { notificationAPI } from '@v/api-client';
import { NotificationService } from '@v/shared';

// Mobile-specific UI using React Native
```

### Phase 5: Incremental Migration

For each feature:
1. Extract domain models → `shared/domain`
2. Extract business logic → `shared/services`
3. Extract API calls → `api-client/endpoints`
4. Update web app to use new structure
5. Create mobile screens using shared code
6. Test both platforms
7. Remove old code

## Migration Order (Recommended)

1. **Notifications** (simplest)
2. **Hashtags** (simple)
3. **Authentication** (foundational)
4. **Posts** (medium complexity)
5. **Messages** (medium complexity)
6. **Debates** (most complex - do last)

## Testing Strategy

After each migration:
1. Test web app functionality
2. Test mobile app functionality
3. Verify shared code works on both platforms
4. Run type checking
5. Test API integration

## Rollback Plan

If something breaks:
1. Keep old code in place until new code is verified
2. Use feature flags to switch between old/new
3. Migrate incrementally (one feature at a time)
4. Test thoroughly before removing old code

## Timeline Estimate

- **Phase 2**: 2-3 hours
- **Phase 3**: 4-6 hours
- **Phase 4**: 3-4 hours
- **Phase 5**: 2-3 days (depending on feature complexity)

**Total**: ~1 week for complete migration

## Notes

- Keep old code until new code is fully tested
- Migrate one feature at a time
- Test after each migration
- Document any issues encountered
- Update this plan as needed

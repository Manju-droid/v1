# @v/shared

Shared business logic and domain models for the V Platform.

## What's Inside

- **domain/**: Pure TypeScript interfaces and types
- **services/**: Business logic (platform-agnostic)
- **utils/**: Utility functions
- **constants/**: Shared constants
- **types/**: Common TypeScript types

## Usage

```typescript
import { User, Post, Debate } from '@v/shared';
import { formatRelativeTime, formatNumber } from '@v/shared';
import { API_BASE_URL, DEBATE_DURATIONS } from '@v/shared';
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev
```

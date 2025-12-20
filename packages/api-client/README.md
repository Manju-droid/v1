# @v/api-client

API client for the V Platform backend.

## What's Inside

- **client.ts**: Base HTTP client with authentication
- **endpoints/**: Feature-specific API endpoint modules

## Usage

```typescript
import { apiClient } from '@v/api-client';
import { authAPI, postAPI } from '@v/api-client';

// Use API methods
const user = await authAPI.getCurrentUser();
const posts = await postAPI.list();
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev
```

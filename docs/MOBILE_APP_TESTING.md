# Mobile App Testing Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI** (optional, but recommended)
4. **Expo Go app** on your phone (iOS/Android) OR **iOS Simulator** / **Android Emulator**

## Step 1: Install Dependencies

First, install all dependencies for the monorepo:

```bash
# From the root directory
cd /Users/manjunadhapabolu/Documents/V2
npm install
```

This will install dependencies for:
- Root workspace
- `packages/shared`
- `packages/api-client`
- `packages/mobile`

## Step 2: Build Shared Packages

The mobile app depends on the shared packages, so build them first:

```bash
# Build shared packages
npm run build:shared
npm run build:api-client
```

## Step 3: Start the Backend Server

The mobile app needs the backend API to be running:

```bash
# From the backend directory
cd backend
go run cmd/api/main.go

# Or use the Makefile
make run

# The backend should be running on http://localhost:8080
```

## Step 4: Start the Mobile App

### Option A: Using Expo CLI (Recommended)

```bash
# From the mobile package directory
cd packages/mobile

# Start Expo development server
npm run dev

# Or use npx expo directly
npx expo start
```

### Option B: Using npm scripts

```bash
# From the root directory
cd packages/mobile
npm run dev
```

## Step 5: Run on Device/Simulator

Once Expo starts, you'll see a QR code and options:

### On Physical Device:
1. **iOS**: Open Camera app, scan QR code, open in Expo Go
2. **Android**: Open Expo Go app, scan QR code

### On Simulator/Emulator:
- Press `i` for iOS Simulator (requires Xcode)
- Press `a` for Android Emulator (requires Android Studio)
- Press `w` for web browser (limited functionality)

## Step 6: Test Features

### 1. Authentication (Phase 8.1)

**Test Login:**
- Navigate to `/login` screen
- Enter email and password
- Should authenticate and redirect

**Test Signup:**
- Navigate to `/signup` screen
- Fill in all required fields
- Should create account and log in

**Test Auth Persistence:**
- Login successfully
- Close and reopen app
- Should remain logged in

### 2. Posts Feature (Phase 8.2)

**Test Posts Feed:**
- Navigate to `/posts` screen
- Should display list of posts
- Pull down to refresh
- Scroll to load more posts

**Test Post Detail:**
- Tap on any post
- Should navigate to `/posts/[id]`
- View post content and comments
- Add a comment

**Test Create Post:**
- Tap "New Post" button
- Enter post content
- Submit post
- Should create and return to feed

**Test Post Actions:**
- React to a post (heart icon)
- Save a post (bookmark icon)
- Share a post (share icon)
- View comments

### 3. Notifications (Already Implemented)

- Navigate to `/notifications`
- Should display notifications list
- Mark as read functionality

## Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
# Rebuild shared packages
npm run build:shared
npm run build:api-client

# Clear Expo cache
cd packages/mobile
npx expo start --clear
```

### Issue: "Cannot connect to backend"

**Check:**
1. Backend is running on `http://localhost:8080`
2. For physical device, use your computer's IP address instead of `localhost`
3. Update API URL in `packages/shared/src/utils/index.ts` if needed

### Issue: "AsyncStorage not found"

**Solution:**
```bash
cd packages/mobile
npm install @react-native-async-storage/async-storage
```

### Issue: Build errors in shared packages

**Solution:**
```bash
# Clean and rebuild
cd packages/shared
rm -rf dist node_modules
npm install
npm run build

cd ../api-client
rm -rf dist node_modules
npm install
npm run build
```

## Testing Checklist

- [ ] App starts without errors
- [ ] Login screen displays correctly
- [ ] Signup screen displays correctly
- [ ] Can login with valid credentials
- [ ] Can create new account
- [ ] Auth persists after app restart
- [ ] Posts feed loads and displays posts
- [ ] Can view post details
- [ ] Can add comments to posts
- [ ] Can create new posts
- [ ] Pull-to-refresh works
- [ ] Infinite scroll works
- [ ] Notifications screen works
- [ ] Error handling works (try invalid login)

## Quick Test Commands

```bash
# Full setup (from root)
npm install
npm run build:shared
npm run build:api-client

# Start backend (in separate terminal)
cd backend && go run cmd/api/main.go

# Start mobile app (in separate terminal)
cd packages/mobile && npm run dev
```

## Environment Variables

The mobile app uses environment variables from `packages/shared`. The API base URL defaults to:
- Development: `http://localhost:8080/api`
- For physical devices: Use your computer's local IP (e.g., `http://192.168.1.100:8080/api`)

## Next Steps

After testing Phase 8.1 and 8.2, you can:
1. Continue with Phase 8.3 (Debates Feature)
2. Fix any issues found during testing
3. Add more features or polish existing ones

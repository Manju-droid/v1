# Debate Social Media Platform

A fullstack debate-first social media web application built with Next.js and Go.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS  
- **State Management**: Zustand
- **Animations**: Framer Motion

### Backend
- **Language**: Go
- **Framework**: Chi Router
- **Storage**: In-Memory (PostgreSQL integration coming soon)

## Features

- ✅ User authentication & profiles
- ✅ Create posts with text/media
- ✅ Real-time reactions & saves
- ✅ Nested comment system
- ✅ User following
- ✅ Hashtag support
- ✅ Post analytics (reach tracking)
- ✅ Profile customization
- 🚧 Comment reactions (client-side only, awaiting database)
- 🚧 PostgreSQL integration (in progress)

## Getting Started

### Prerequisites
- Node.js 18+
- Go 1.21+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd v1
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd backend
go mod download
```

4. Set up environment variables
```bash
# Create .env files based on .env.example
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

5. Run development servers
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:web
```

## Deployment

### Docker (Coming Soon)
Docker and docker-compose files will be added for easy deployment.

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

#### Backend (.env)
```
PORT=8080
FRONTEND_URL=http://localhost:3000
```

## Project Structure

```
v1/
├── frontend/          # Next.js frontend application
│   ├── app/          # App router pages
│   ├── components/   # Reusable components
│   ├── features/     # Feature-specific modules
│   └── lib/          # Utilities & state management
├── backend/          # Go backend API
│   ├── cmd/          # Application entrypoints
│   ├── internal/     # Internal packages
│   │   ├── api/      # HTTP handlers
│   │   ├── models/   # Data models
│   │   └── repository/ # Data access layer
└── shared/           # Shared types/contracts
```

## Known Limitations

- **Data Persistence**: Currently using in-memory storage. All data resets on server restart.
- **Comment Reactions**: Not persisted (requires database + API endpoints)
- **WebSockets**: Real-time updates not yet implemented

## Roadmap

- [ ] PostgreSQL integration
- [ ] Comment reaction persistence  
- [ ] WebSocket support for real-time updates
- [ ] Docker containerization
- [ ] AWS deployment configuration
- [ ] CI/CD pipeline

## License

MIT

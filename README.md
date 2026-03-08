# JanMitra Backend

Backend API for JanMitra - AI assistant that helps Indians discover government schemes.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Schemes
- `GET /api/schemes` - Get all schemes
- `GET /api/schemes/category/:category` - Get schemes by category
- `GET /api/schemes/:id` - Get specific scheme
- `POST /api/schemes/search` - Search schemes

### Eligibility
- `POST /api/eligibility/check` - Check eligibility for a scheme
- `GET /api/eligibility/:schemeId` - Get eligibility criteria

### Documents
- `GET /api/documents/:schemeId` - Get document checklist
- `POST /api/documents/progress` - Update document progress

### Chat
- `POST /api/chat/message` - Send message to AI assistant

## Server runs on
http://localhost:3000

# JanMitra - Complete Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **AWS Account** with credentials for: DynamoDB, Bedrock (Claude), Polly, Translate

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS & Environment

Copy `.env.example` to `.env` and fill in your values:
```env
PORT=3000
JWT_SECRET=your_secure_random_secret_key_here

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# AWS_SESSION_TOKEN=...   # only for temporary credentials (SSO / Kiro)

BEDROCK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0
DYNAMO_SCHEMES_TABLE=JanMitra_Schemes
DYNAMO_USERS_TABLE=JanMitra_Users

GEMINI_API_KEY=your_gemini_api_key_here  # fallback if Bedrock unavailable
```

**Important:** Change `JWT_SECRET` to a secure random string in production!

### 3. Seed DynamoDB Tables (first run only)

```bash
npm run seed:dynamo
```
This creates the `JanMitra_Schemes` and `JanMitra_Users` tables and loads scheme data.
Requires valid AWS credentials in `.env`. If no credentials are set, the app automatically
falls back to local JSON files (`data/schemes.json`, `data/users.json`).

### 4. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

Server will run at: **http://localhost:3000**

## Testing the Application

### 1. Open the Landing Page
Navigate to: http://localhost:3000/index.html

### 2. Register a New Account
- Click "ASK JANMITRA" button
- Click "Register"
- Fill in your details
- Submit

### 3. Test Document Checklist
- Navigate to: http://localhost:3000/checklist.html
- Check/uncheck documents
- Progress is automatically saved to your account

### 4. Test API Endpoints

**Health Check:**
```bash
curl http://localhost:3000/api/health
```

**Get All Schemes:**
```bash
curl http://localhost:3000/api/schemes
```

**Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Features Implemented

### Backend
✅ Express.js REST API
✅ Amazon DynamoDB (with local JSON file fallback)
✅ User authentication (JWT)
✅ Password hashing (bcrypt)
✅ Protected routes with middleware
✅ Document progress tracking
✅ Scheme management
✅ Eligibility checking
✅ Chat API endpoint

### Frontend
✅ Beautiful landing page
✅ Interactive document checklist
✅ Login/Register modal
✅ API integration
✅ Progress persistence
✅ Responsive design

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Schemes
- `GET /api/schemes` - Get all schemes
- `GET /api/schemes/category/:category` - Get by category
- `GET /api/schemes/:id` - Get specific scheme
- `POST /api/schemes/search` - Search schemes

### Eligibility
- `POST /api/eligibility/check` - Check eligibility
- `GET /api/eligibility/:schemeId` - Get criteria

### Documents
- `GET /api/documents/:schemeId` - Get checklist
- `GET /api/documents/progress/:schemeId` - Get user progress (protected)
- `POST /api/documents/progress` - Update progress (protected)

### Chat
- `POST /api/chat/message` - Send message to AI

## Project Structure

```
janmitra/
├── config/
│   └── database.js          # no-op (DynamoDB needs no persistent connection)
├── data/
│   ├── schemes.json         # Scheme data
│   └── documents.json       # Document checklists
├── js/
│   ├── api.js              # Frontend API client
│   └── auth-ui.js          # Auth UI components
├── middleware/
│   └── auth.js             # JWT authentication
├── models/
│   └── User.js             # User schema
├── routes/
│   ├── auth.js             # Auth endpoints
│   ├── schemes.js          # Scheme endpoints
│   ├── eligibility.js      # Eligibility endpoints
│   ├── documents.js        # Document endpoints
│   └── chat.js             # Chat endpoints
├── index.html              # Landing page
├── checklist.html          # Document checklist
├── server.js               # Main server file
├── package.json            # Dependencies
└── .env                    # Environment config
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check connection string in `.env`
- Verify MongoDB port (default: 27017)

### Port Already in Use
- Change PORT in `.env` file
- Or kill process using port 3000

### CORS Errors
- Ensure backend is running
- Check API_BASE_URL in `js/api.js`

## Next Steps

1. **Add More Schemes** - Edit `data/schemes.json`
2. **Integrate Real AI** - Update `routes/chat.js` with AI service
3. **Add Email Verification** - Implement email service
4. **Deploy to Production** - Use services like Heroku, Railway, or AWS

## Support

For issues or questions, check the code comments or create an issue in the repository.

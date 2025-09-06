# SalonTime Backend API

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase project

### Installation

1. **Clone and setup:**
```bash
cd salontime-backend
npm install
```

2. **Environment configuration:**
```bash
cp .env.example .env
```

3. **Configure your .env file:**
```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:3000
```

4. **Start the server:**
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

## 🔐 Authentication Flow

### OAuth with WebView Integration

The authentication system uses Supabase OAuth with WebView support for Flutter frontend.

#### 1. Generate OAuth URL
```http
POST /api/auth/oauth/generate-url
Content-Type: application/json

{
  "provider": "google",
  "user_type": "client"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "oauth_url": "https://supabase-oauth-url...",
    "provider": "google",
    "user_type": "client"
  }
}
```

#### 2. Handle OAuth Callback
After user completes OAuth in WebView, send the tokens:

```http
POST /api/auth/oauth/callback
Content-Type: application/json

{
  "access_token": "supabase_access_token",
  "refresh_token": "supabase_refresh_token",
  "user_type": "client"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "user_type": "client",
      "first_name": "John",
      "last_name": "Doe",
      "avatar_url": "https://...",
      "language": "en"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600,
      "token_type": "bearer"
    }
  }
}
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/oauth/generate-url` - Generate OAuth URL for WebView
- `POST /api/auth/oauth/callback` - Process OAuth callback
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/signout` - Sign out user
- `GET /api/auth/check` - Check authentication status

### Users
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/dashboard` - Get user dashboard data

### System
- `GET /health` - Health check endpoint

## 🔑 Authentication Headers

For protected endpoints, include the JWT token:

```http
Authorization: Bearer your_jwt_token
```

## 🗄️ Database Schema

The API expects these Supabase tables:

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  user_type VARCHAR(20) CHECK (user_type IN ('client', 'salon_owner', 'admin')),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  language VARCHAR(10) DEFAULT 'en',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Development

### Running Tests
```bash
npm test
```

### Code Linting
```bash
npm run lint
```

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/         # API routes
├── services/       # Business logic
└── utils/          # Utility functions
```

## 📝 Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common error codes:
- `MISSING_TOKEN` - No authorization token provided
- `INVALID_TOKEN` - Token is invalid or expired
- `VALIDATION_ERROR` - Request validation failed
- `PROFILE_NOT_FOUND` - User profile doesn't exist
- `OAUTH_ERROR` - OAuth flow failed

## 🚦 Rate Limiting

- **100 requests per 15 minutes** per IP address
- Rate limit headers included in responses
- `429 Too Many Requests` when limit exceeded

## 📊 Monitoring

### Health Check
```http
GET /health
```

Returns server status and version information.

### Logs
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development mode

---

## 🎯 Next Steps

1. **Supabase Setup**: Create the required database tables
2. **OAuth Configuration**: Set up Google/Facebook OAuth in Supabase
3. **Frontend Integration**: Implement WebView OAuth flow
4. **Testing**: Test authentication flow end-to-end

The authentication system is now ready for integration with the Flutter frontend!


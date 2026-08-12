# FinTrack Backend API

##  Project Description

This is the backend API for FinTrack, a personal finance tracker application. It provides RESTful endpoints for managing financial data.

###  Simple Explanation

"Think of this backend as the kitchen of a restaurant. It takes orders (requests), prepares the food (processes data), talks to the refrigerator (database), and serves meals (responses)."

### 👨 Technical Explanation

"This is an Express.js server with MongoDB integration. It handles API requests, performs validation, manages database connections, and returns JSON responses."

##  Tech Stack

- **Node.js** v22 LTS
- **Express** v5.0.0+
- **MongoDB** v8.0+
- **Mongoose** v8.8.0+
- **Nodemon** v3.1.0+

##  Setup Instructions

### Prerequisites

1. **Node.js** v22 or higher
   ```bash
   node --version

2. MongoDB (local or Atlas)
    - Local: https://www.mongodb.com/try/download/community
    - Atlas: https://www.mongodb.com/products/platform/atlas-database

### Installation

# 1. Clone the repository (if using Git)
git clone <your-backend-repo-url>
cd backend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Edit .env with your values
# PORT=5000
# MONGO_URI=your_mongodb_connection_string
# FRONTEND_URL=http://localhost:5173
# NODE_ENV=development

# 5. Start the server
npm run dev

Environment Variables
Variable	Example	Purpose
PORT	5000	Server port
MONGO_URI	mongodb+srv://user:pass@cluster.mongodb.net/fintrack	MongoDB connection string
FRONTEND_URL	http://localhost:5173	Allowed CORS origin
NODE_ENV	development	Environment mode

### API Endpoints

Health Check
GET /api/health

Response:

{
  "status": "OK",
  "timestamp": "2026-06-15T10:00:00.000Z",
  "uptime": 123.45,
  "mongoConnected": true,
  "mongoState": "connected"
}

Test Connection
GET /api/test

Response:

{
  "success": true,
  "message": "API connection successful",
  "data": {
    "backendStatus": "healthy",
    "timestamp": "2026-06-15T10:00:00.000Z",
    "environment": "development"
  }
}

404 Not Found
GET /api/unknown

Response:

{
  "success": false,
  "message": "Route not found",
  "path": "/api/unknown"
}

Testing with Postman
1. Import Collection: [Link to Postman Collection]

2. Test Health Check:

    - Method: GET

    - URL: http://localhost:5000/api/health

    - Click "Send"

    - Expected: 200 OK with JSON response

3. Test API Connection:

   - Method: GET

   - URL: http://localhost:5000/api/test

   - Click "Send"

   -Expected: 200 OK with success response

  ###  Troubleshooting
MongoDB Connection Failed
Error: MongoDB Connection Error: Authentication failed

Solution: Check your MONGO_URI in .env file. Make sure username and password are correct.

Port Already in Use
Error: Error: listen EADDRINUSE: address already in use :::5000

Solution: Change PORT in .env file or kill the process using the port:

# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>

CORS Error
Error: Access to XMLHttpRequest at 'http://localhost:5000/api/test' from origin 'http://localhost:5173' has been blocked by CORS policy

Solution: Check FRONTEND_URL in .env matches your frontend URL.




## Domain 1: Authentication & Authorization

### Overview
Complete authentication system with user registration, login, email verification, password reset, and JWT-based session management.

### Features Implemented
-  User registration with password hashing
-  User login with JWT authentication
-  Email verification flow (tokens expire after 24 hours)
-  Password reset flow (tokens expire after 1 hour)
-  JWT access tokens (15-minute expiry)
-  JWT refresh tokens (7-day expiry)
-  Rate limiting (register: 3/hr, login: 5/15min, forgot: 3/hr)
-  Account lockout (5 failed attempts = 15min lock)
-  Role-based access control (user/admin)

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/verify-email/:token` | Verify email |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| POST | `/api/auth/logout` | Logout |

### Environment Variables
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fintrack
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
BCRYPT_ROUNDS=10
CLIENT_URL=http://localhost:5173

Related Repositories

- Frontend Repository
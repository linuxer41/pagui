# Zitadel API

A simple API for interacting with Zitadel identity management service using fetch requests instead of libraries.

## Features

- User registration with email verification
- Email verification
- User details retrieval
- Resend verification emails

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Build the TypeScript files:
   ```
   npm run build
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with hot-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Register a new user
```
POST /api/zitadel/register
```

Request body:
```json
{
  "email": "user@example.com",
  "username": "username",
  "firstName": "First",
  "lastName": "Last",
  "password": "securePassword123"
}
```

### Verify email
```
POST /api/zitadel/verify-email
```

Request body:
```json
{
  "userId": "user-id-from-registration",
  "code": "verification-code-from-email"
}
```

### Get user details
```
GET /api/zitadel/users/:userId
```

### Resend verification email
```
POST /api/zitadel/resend-verification
```

Request body:
```json
{
  "userId": "user-id"
}
```

## Configuration

The API is configured to use the following Zitadel settings:

- Authority: http://localhost:8080
- Client ID: 329787334008569858
- Client Secret: LJIV6EC3Mf06dfGDHAOsKJxlIhhxwdrbsR8m3lrz4drVrrZ7C7ukPj40OIP22HKY

You can modify these settings in the `zitadel-api.ts` file if needed.
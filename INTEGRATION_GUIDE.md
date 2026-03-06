# Implementing Token Middleware for EGO Services

This guide explains how to integrate any EGO Service with Utils Manager's authentication system.

## Overview

Utils Manager acts as the **SSO source of truth**. When a user logs in, Utils Manager issues a JWT token. Other services (EGO Services) must validate this token before allowing access.

## Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│   Utils Manager      │  JWT    │   Your Service       │
│   (Port 3002)       │ ──────► │   (Any port)         │
│                     │         │                      │
│  - Issues tokens    │ Verify  │  - Validates JWT     │
│  - Revokes on logout│ ◄────── │  - Checks revocation │
└──────────────────────┘         └──────────────────────┘
```

## Environment Variables

Your service needs these environment variables:

```bash
# Required - MUST match Utils Manager's JWT_SECRET
JWT_SECRET=your_utils_manager_jwt_secret

# URL of Utils Manager for token verification
# Use internal Docker network name (e.g., http://utils-manager:3000)
UTILS_VERIFY_URL=http://utils-manager:3000/auth/verify

# Must match INTERNAL_AUTH_SECRET in Utils Manager's .env
INTERNAL_AUTH_SECRET=your_internal_auth_secret

# Where to redirect unauthenticated users
UTILS_LOGIN_URL=http://localhost:3002/login
```

## Implementation

### Python / FastAPI

Install the JWT library:

```bash
pip install pyjwt
```

Add this to your `main.py`:

```python
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
import jwt
from jwt import InvalidTokenError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen
from urllib.error import URLError, HTTPError
import os

app = FastAPI()

AUTH_REDIRECT_URL = os.getenv("UTILS_LOGIN_URL", "http://localhost:3002/login")
UTILS_VERIFY_URL = os.getenv("UTILS_VERIFY_URL", "http://localhost:3000/auth/verify")
INTERNAL_AUTH_SECRET = os.getenv("INTERNAL_AUTH_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")


def get_token(request: Request):
    # Check cookie first
    token = request.cookies.get("ego_token")
    if token:
        return token

    # Then Authorization header
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        return auth.replace("Bearer ", "", 1)

    # Finally query param
    return request.query_params.get("token")


def clean_path_without_token(request: Request):
    """Remove token from URL query params."""
    params = [(k, v) for k, v in request.query_params.multi_items() if k != "token"]
    if not params:
        return request.url.path
    return f"{request.url.path}?{urlencode(params)}"


def is_token_active(token: str) -> bool:
    """Verify token is not revoked via Utils Manager."""
    if not UTILS_VERIFY_URL or not INTERNAL_AUTH_SECRET:
        return False

    req = UrlRequest(
        UTILS_VERIFY_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "x-internal-auth": INTERNAL_AUTH_SECRET,
        },
        method="GET",
    )

    try:
        with urlopen(req, timeout=2) as response:
            return response.status == 200
    except (URLError, HTTPError):
        return False


@app.middleware("http")
async def require_auth(request: Request, call_next):
    # Skip auth for health endpoints
    if request.url.path in ["/health", "/ping"]:
        return await call_next(request)

    token = get_token(request)
    if not token:
        return RedirectResponse(AUTH_REDIRECT_URL, status_code=307)

    if not JWT_SECRET:
        return JSONResponse(
            {"error": "JWT_SECRET is not configured"},
            status_code=500
        )

    # Step 1: Validate JWT signature locally
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        request.state.user = {"username": payload.get("sub")}
    except InvalidTokenError:
        return RedirectResponse(AUTH_REDIRECT_URL, status_code=307)

    # Step 2: Verify token is not revoked
    if not is_token_active(token):
        return RedirectResponse(AUTH_REDIRECT_URL, status_code=307)

    # Step 3: If token came via query param, persist as cookie and clean URL
    if request.query_params.get("token"):
        response = RedirectResponse(clean_path_without_token(request), status_code=307)
        response.set_cookie("ego_token", token, httponly=True, samesite="strict")
        return response

    return await call_next(request)
```

### Node.js / Express

Install dependencies:

```bash
npm install jsonwebtoken cookie-parser
```

Create middleware `middleware/requireAuth.js`:

```javascript
import jwt from 'jsonwebtoken'

const AUTH_REDIRECT_URL = process.env.UTILS_LOGIN_URL || 'http://localhost:3002/login'
const UTILS_VERIFY_URL = process.env.UTILS_VERIFY_URL || 'http://localhost:3000/auth/verify'
const INTERNAL_AUTH_SECRET = process.env.INTERNAL_AUTH_SECRET || ''
const JWT_SECRET = process.env.JWT_SECRET

function getToken(req) {
  return (
    req.cookies?.ego_token ||
    req.headers.authorization?.replace('Bearer ', '') ||
    req.query.token
  )
}

function cleanPathWithoutToken(req) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  url.searchParams.delete('token')
  return url.pathname + url.search
}

async function isTokenActive(token) {
  if (!UTILS_VERIFY_URL || !INTERNAL_AUTH_SECRET) return false

  try {
    const res = await fetch(UTILS_VERIFY_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-internal-auth': INTERNAL_AUTH_SECRET,
      },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function requireAuth(req, res, next) {
  const token = getToken(req)

  if (!token) {
    return res.redirect(AUTH_REDIRECT_URL)
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { username: payload.sub }
  } catch {
    return res.redirect(AUTH_REDIRECT_URL)
  }

  const active = await isTokenActive(token)
  if (!active) {
    return res.redirect(AUTH_REDIRECT_URL)
  }

  // If token came via query param, set cookie and clean URL
  if (req.query.token) {
    res.cookie('ego_token', token, { httpOnly: true, sameSite: 'strict' })
    return res.redirect(cleanPathWithoutToken(req))
  }

  next()
}
```

Mount it in your Express app:

```javascript
import cookieParser from 'cookie-parser'
import { requireAuth } from './middleware/requireAuth.js'

app.use(cookieParser())
app.use(requireAuth)  // Protects all routes
```

## Docker Compose Integration

Add your service to the same Docker network as Utils Manager:

```yaml
services:
  utils-manager:
    # ... existing config

  your-service:
    build: ./your-service
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - UTILS_VERIFY_URL=http://utils-manager:3000/auth/verify
      - INTERNAL_AUTH_SECRET=${INTERNAL_AUTH_SECRET}
      - UTILS_LOGIN_URL=http://localhost:3002/login
    depends_on:
      - utils-manager
```

## Registering Your Service in Utils Manager

1. Go to **Admin > Providers**
2. Create a new provider:
   - **Name**: Your service name
   - **Base URL**: Your service URL (e.g., `http://your-service:8000`)
   - **Is EGO Service**: ✅ Yes
3. Go to **Admin > Tools**
4. Create a new tool:
   - **Name**: Your service name
   - **URL**: Your service URL
   - **Provider**: Select your provider

Now when users click the tool in the dashboard, Utils Manager will:
1. Redirect to your service with `?token=<jwt>`
2. Your middleware will validate and store the token as a cookie
3. Subsequent requests will use the cookie

## How It Works

1. **Login** → Utils Manager issues JWT
2. **Click Tool** → Utils Manager redirects with `?token=<jwt>`
3. **First Request** → Your service validates JWT + checks revocation + sets cookie + redirects clean
4. **Subsequent Requests** → Cookie is sent automatically
5. **Logout** → Utils Manager revokes token, next request to your service redirects to login

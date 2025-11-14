# Firebase Initialization Patterns

The project uses **3 distinct Firebase initialization patterns** that should be reused consistently across all scripts and components to avoid confusion and duplication.

## Pattern 1: Client SDK for Web Components
**Location**: `app/utils/firebase.ts` - **PRIMARY PATTERN FOR WEB APP**

```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Singleton pattern - prevents duplicate initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
```

**When to Use**: All React components, utility functions in `app/` directory, and client-side Firebase operations.

## Pattern 2: Admin SDK for Server Scripts
**Location**: `scripts/upload-whatsapp-groups.js` and other admin scripts

```javascript
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK (only once check)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'congressdashboard-e521d'
  });
}

const db = getFirestore();
```

**When to Use**: 
- Server-side scripts with elevated permissions
- Bulk data operations
- Administrative tasks
- Scripts that don't need user authentication

**Key Benefits**: 
- No API keys required (uses service account)
- Bypasses security rules
- Full admin access to Firestore

## Pattern 3: Client SDK for Node.js Scripts
**Location**: `scripts/analyze-slp-activity-status.js`, `scripts/sync-slp-activity-status.js`, etc.

```javascript
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase configuration (same as web app)
const firebaseConfig = {
  apiKey: "AIzaSyDD9RZZM8u5_Q6I24SJk1_jACFeZTGgSpw",
  authDomain: "congressdashboard-e521d.firebaseapp.com",
  projectId: "congressdashboard-e521d",
  storageBucket: "congressdashboard-e521d.firebasestorage.app",
  messagingSenderId: "561776205072",
  appId: "1:561776205072:web:003a31ab2a9def84915995"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
```

**When to Use**:
- Node.js scripts that need read-only access
- Scripts that should respect security rules
- Analysis and reporting scripts
- Scripts that don't need admin privileges

## Pattern Selection Guide

| Use Case | Pattern | Reason |
|----------|---------|---------|
| React Components | Client SDK (Pattern 1) | Web-optimized, authentication support |
| Admin Scripts | Admin SDK (Pattern 2) | Elevated permissions, no API limits |
| Analysis Scripts | Client SDK (Pattern 3) | Respects security rules, read-only safe |
| Bulk Uploads | Admin SDK (Pattern 2) | Bypass rate limits, batch operations |
| User-facing Features | Client SDK (Pattern 1) | Authentication integration |

## Reusability Instructions

**For New Scripts:**
1. **Determine needed permissions**: Admin (Pattern 2) vs Regular (Pattern 3)
2. **Copy exact config**: Use the same `firebaseConfig` object from existing files
3. **Include singleton check**: For admin scripts, always check `!admin.apps.length`
4. **Import consistency**: Use the same import statements as existing scripts

**Common Mistakes to Avoid:**
- ❌ Creating new Firebase apps with different configs
- ❌ Missing singleton checks (causes initialization errors)
- ❌ Using admin SDK when client SDK is sufficient
- ❌ Hardcoding different project IDs or API keys

**Environment Variables:** 
- Not required for scripts (configs are hardcoded)
- Admin SDK uses default service account authentication
- Client SDK uses public config (safe to commit)

## Authentication & Role-based Redirection

### Middleware-based Access Control
**Location**: `middleware.ts` and `app/utils/authMiddleware.ts`

**Architecture**: Server-side role-based routing that prevents UI flash and blocks unauthorized access

**Flow**:
1. **Authentication Check**: Middleware verifies auth token from cookies
2. **Role Resolution**: Extracts UID from JWT token and fetches user role from Firestore
3. **Access Control**: Enforces role-based access before page renders
4. **Automatic Redirection**: Routes users to appropriate dashboards based on role

**Implementation**:
```typescript
// middleware.ts - Server-side role-based access control
export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const isHomePage = request.nextUrl.pathname === '/home';
  
  // Role-based access control for /home route
  if (authToken && isHomePage) {
    const uid = extractUidFromToken(authToken);
    const adminUser = await getAdminUserForMiddleware(uid);
    
    // Only allow admin users to access /home
    if (adminUser.role !== 'admin') {
      const redirectUrl = getRedirectUrl(adminUser);
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
  }
}
```

**Role-based Redirection Rules**:
- **Admin**: `/home` (full dashboard access)
- **Dept-head (YouTube)**: `/wtm-youtube`
- **Dept-head (WTM/Shakti)**: `/wtm-slp-new`
- **Zonal-incharge**: `/wtm-slp-new`
- **Others**: `/wtm-slp-new` (default)

**Key Benefits**:
- ✅ **No UI Flash**: Server-side redirection prevents brief home page visibility
- ✅ **Back Button Protection**: Non-admins cannot navigate back to /home
- ✅ **Centralized Logic**: Single source of truth for role-based routing
- ✅ **Security**: Server-side enforcement prevents client-side bypassing

### Admin Create Account Flow (Secondary Firebase App)

- Location: `app/home/page.tsx` (Create Account modal form)
- Purpose: Allow admin to create Dept-Head/Zonal-Incharge accounts without disrupting current admin session.
- Initialization Pattern: The secondary Firebase app now reuses the primary app configuration to avoid environment variable dependencies.

```ts
// Secondary app now uses primary app's options
import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const primaryApp = getApp();
const secondaryApp = initializeApp(primaryApp.options, `secondary-${Date.now()}`);
const secondaryAuth = getAuth(secondaryApp);
```

- Why: Removes reliance on `NEXT_PUBLIC_*` Firebase env vars and fixes `Firebase: Error (auth/invalid-api-key)` when those envs are absent.
- Cleanup: `deleteApp(secondaryApp)` after user creation to prevent resource leaks.
- Firestore Write: New admin user is stored in `admin-users` via the primary DB instance.

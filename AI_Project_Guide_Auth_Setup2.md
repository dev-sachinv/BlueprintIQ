# AI Project Guide — Multi-User Sign-In Setup
### Adding Supabase Auth so multiple people can use the app after deploying to Vercel

Stack cost: **$0 — 100% free tier** (reuses the Supabase project already in the stack)

---

## 1 · Overview

Right now the app works for one user at a time. This adds real sign-up/sign-in so multiple people can use it after it's live on Vercel, with each person's generated plans kept private to them.

**Why Supabase Auth specifically:** it's already part of the stack (same free project used for Postgres/storage), so this adds zero new services, zero new cost, and zero new accounts to manage.

**What it adds:**
- Email/password sign-up and sign-in
- Session persistence (user stays logged in on refresh)
- Protected routes (dashboard only visible when logged in)
- Backend verification (FastAPI checks who's calling, not just the frontend)
- Row-level data isolation (one user can never see another user's plans, even if they try to call the API directly)

---

## 2 · Enable Auth in Supabase

In the Supabase dashboard → **Authentication → Providers** → enable **Email**.
(Google/GitHub login can be added later the same way — one toggle each, no extra backend work.)

---

## 3 · Install the client

```bash
npm install @supabase/supabase-js
```

```js
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 4 · Auth context (tracks login state app-wide)

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

Wrap `<App />` in `<AuthProvider>` inside `main.jsx`.

---

## 5 · Sign-in / sign-up page

```jsx
// src/pages/SignIn.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const fn = mode === 'signin'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    if (error) setError(error.message)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-semibold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <input type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
      <input type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded" required />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" className="w-full bg-black text-white p-2 rounded">
        {mode === 'signin' ? 'Sign in' : 'Sign up'}
      </button>
      <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="text-sm text-blue-600 w-full">
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </form>
  )
}
```

---

## 6 · Protect the dashboard route

```jsx
// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/signin" replace />
  return children
}
```

---

## 7 · Backend: verify the user on every FastAPI request

The frontend sends the Supabase JWT (`session.access_token`) with each request. Verify it server-side so people can only read/write their own plans.

```python
# pip install pyjwt --break-system-packages
import jwt
from fastapi import Header, HTTPException

SUPABASE_JWT_SECRET = "your-jwt-secret-from-supabase-settings"

def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]  # user's UUID
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

Use it in any endpoint that touches user data:

```python
@app.get("/plans")
def get_plans(user_id: str = Depends(get_current_user)):
    # filter Postgres query by user_id
    ...
```

---

## 8 · Lock data down at the database level too

Turn on **Row Level Security** on the `plans` table in Supabase and add:

```sql
CREATE POLICY "Users can only see their own plans"
ON plans FOR ALL
USING (auth.uid() = user_id);
```

This protects data even if someone calls Supabase directly, bypassing the FastAPI backend entirely.

---

## 9 · Vercel deployment

Add as environment variables in the Vercel project settings (never commit these to git):

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | from Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | from Supabase project settings |

The anon key is safe to expose client-side — Row Level Security is what actually protects the data, not key secrecy.

---

## Closing Note

This whole loop stays inside the same free-tier stack already used for the rest of the app: Supabase handles signup/login/sessions, React gates routes with the session state, and FastAPI + RLS policies make sure one user's generated plans never leak to another. No new service, no new cost, no new account to manage.

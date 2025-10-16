# OAuth2 Database Connection Fix - Implementation Plan

**Branch:** oauth2
**Issue:** Database connection string is not defined error occurring after OAuth2 Google login authorization

## Problem Analysis

After investigating the codebase, the root cause has been identified:

### Current State

1. **Environment Variable Name:** The app uses `DATABASE_URL_NEW` in `.env.local`
2. **Database Client Creation:** `lib/db.ts:43` looks for `process.env.DATABASE_URL_NEW`
3. **Other API Routes:** Regular API routes (e.g., `/api/periods/route.ts`, `/api/categories/route.ts`) import the pre-initialized `sql` client from `lib/db.ts:152`
4. **OAuth Route Issue:** The OAuth route at `app/api/auth/[...nextauth]/route.ts` calls `getOrCreateGoogleUser()` which imports `sql` from `lib/db.ts`

### Root Cause

The error "Database connection string is not defined" suggests that when the NextAuth OAuth callback executes, the `process.env.DATABASE_URL_NEW` environment variable is not available. This could be due to:

1. **Server-Side vs Edge Runtime:** NextAuth routes might be running in an edge runtime where environment variables are not automatically loaded
2. **Module Initialization Timing:** The `sql` client is created at module load time (line 152 in `lib/db.ts`), and the environment variable might not be available yet
3. **Next.js Environment Variable Naming:** Next.js has special handling for environment variables, and `DATABASE_URL_NEW` might need to be prefixed with `NEXT_PUBLIC_` for client-side access, or the route might need runtime configuration

### Comparison with Other Routes

- **Working routes** (periods, categories, etc.): These work because they run in the standard Node.js runtime with full access to `process.env`
- **OAuth route**: This might be running in Edge Runtime or a different context where environment variables need special configuration

## Implementation Plan

### Task List

- [ ] **Task 1:** Verify Next.js Runtime Configuration

  - Check if NextAuth route is using Edge Runtime
  - Document current runtime configuration
  - Identify if runtime needs to be explicitly set to nodejs

- [ ] **Task 2:** Add Runtime Configuration to NextAuth Route

  - Add `export const runtime = 'nodejs'` to ensure Node.js runtime
  - Test if this resolves the environment variable access issue

- [ ] **Task 3:** Investigate Environment Variable Loading

  - Check if other environment variables (NEXTAUTH_SECRET, GOOGLE_CLIENT_ID) are accessible
  - Add debug logging to track environment variable availability
  - Verify Next.js environment variable loading order

- [ ] **Task 4:** Update Database Client Initialization (if needed)

  - Consider lazy initialization pattern instead of module-level initialization
  - Implement connection pooling if not already present
  - Add fallback mechanisms for environment variable loading

- [ ] **Task 5:** Add Error Handling and Logging

  - Enhance error messages to include more context
  - Add startup checks for required environment variables
  - Log environment variable availability at OAuth callback execution

- [ ] **Task 6:** Test OAuth Flow End-to-End

  - Test Google OAuth login
  - Verify database connection is established
  - Confirm user creation/retrieval works correctly
  - Test subsequent logins with existing users

- [ ] **Task 7:** Update Documentation
  - Document the fix in this file
  - Update oauth2-implementation-summary.md with findings
  - Add troubleshooting section for similar issues

## Technical Details

### Files to Modify

1. **`app/api/auth/[...nextauth]/route.ts`**

   - Add runtime configuration
   - Add environment variable validation
   - Enhance error logging

2. **`lib/db.ts`**

   - Consider lazy initialization
   - Add better error context
   - Improve environment variable checking

3. **`lib/user-management.ts`**
   - Add error handling for database connection failures
   - Add logging for debugging

### Proposed Solutions (Priority Order)

#### Solution 1: Force Node.js Runtime (Recommended)

```typescript
// app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs"; // Add this line at the top

const { handlers, auth, signIn, signOut } = NextAuth({
  // ... rest of config
});
```

#### Solution 2: Lazy Database Initialization

```typescript
// lib/db.ts
let _sql: any = null;

export function getSql() {
  if (!_sql) {
    const { sql } = createSafeClient();
    _sql = sql;
  }
  return _sql;
}
```

#### Solution 3: Environment Variable Validation

```typescript
// app/api/auth/[...nextauth]/route.ts
// At the top of the file, before NextAuth initialization
if (!process.env.DATABASE_URL_NEW) {
  console.error(
    "DATABASE_URL_NEW is not defined. Available env vars:",
    Object.keys(process.env).filter((k) => k.includes("DATABASE"))
  );
  throw new Error("DATABASE_URL_NEW environment variable is required");
}
```

### Testing Strategy

1. **Unit Tests**

   - Test database connection with and without environment variables
   - Test error handling in getOrCreateGoogleUser

2. **Integration Tests**

   - Test complete OAuth flow
   - Test user creation on first login
   - Test user retrieval on subsequent logins

3. **Manual Testing**
   - Clear browser cookies/session
   - Attempt Google OAuth login
   - Verify no database connection errors
   - Check user is created in database
   - Attempt second login to verify user retrieval

## Success Criteria

- [ ] OAuth2 Google login completes without database connection errors
- [ ] New users are successfully created in the database
- [ ] Existing users are successfully retrieved on subsequent logins
- [ ] No regression in other parts of the application
- [ ] All tests pass
- [ ] Documentation is updated

## Rollback Plan

If the changes cause issues:

1. Revert changes to `app/api/auth/[...nextauth]/route.ts`
2. Revert changes to `lib/db.ts` (if modified)
3. Test that password-based authentication still works
4. Investigate alternative solutions

## Notes

- The environment variable `DATABASE_URL_NEW` is correctly defined in `.env.local`
- Other routes successfully use the database connection
- This appears to be specific to the NextAuth OAuth callback execution context
- NextAuth v5 (beta) has different runtime requirements than v4

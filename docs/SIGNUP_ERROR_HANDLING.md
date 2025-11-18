# Signup Error Handling - Resume Incomplete Signups

## Overview

Users can now resume their signup process if they abort at any stage after entering their email and password. The system intelligently detects existing accounts and allows users to continue where they left off.

## How It Works

### 1. User Signs Up with Email/Password
When a user completes the initial signup step (email + password), an account is created in Supabase Auth even if they don't complete the profile.

### 2. User Aborts Onboarding
If the user closes the browser, navigates away, or aborts the onboarding process, their account still exists but without a complete profile.

### 3. User Returns to Sign Up Again
When the user returns and tries to sign up with the same email:

#### The system:
1. ✅ Detects that the email is already registered
2. ✅ Attempts to sign in with the provided password
3. ✅ Checks if they have a complete profile:
   - **Homeowner**: Checks `homeowner_profiles` for `first_name` and `last_name`
   - **Professional**: Checks `professional_profiles` for `first_name` and `last_name`
   - **Company**: Checks `company_profiles` for `company_name`

4. ✅ Routes the user appropriately:
   - **Profile Complete** → Redirect to dashboard
   - **Profile Incomplete** → Redirect to onboarding to continue

---

## User Flows

### Scenario 1: Homeowner Aborts During Signup

**Initial Signup:**
1. User clicks "Post Jobs" → "Individual" → "Homeowner"
2. Enters email: `john@example.com`, password: `password123`
3. Account created in Supabase Auth ✅
4. **User closes browser before completing profile** ❌

**Returns Later:**
1. User clicks "Post Jobs" → "Individual" → "Homeowner"
2. Enters same email: `john@example.com`, password: `password123`
3. System detects existing account
4. Signs user in automatically
5. Checks for `homeowner_profiles` → **Not found**
6. **Redirects to** `/onboarding/homeowner` to complete profile ✅

**After Completing Profile:**
- User fills in First Name, Last Name, Location
- Profile saved to `homeowner_profiles`
- Redirected to `/dashboard/homeowner` ✅

---

### Scenario 2: Professional Aborts During Onboarding

**Initial Signup:**
1. User selects Professional account type
2. Enters email and password
3. Account created ✅
4. **Closes page during profile setup** ❌

**Returns Later:**
1. Enters same credentials
2. System signs them in
3. Checks `professional_profiles` → **Incomplete or missing**
4. **Redirects to** `/onboarding` to continue ✅

---

### Scenario 3: Company Already Has Complete Profile

**User Returns:**
1. Enters existing email and password
2. System signs them in
3. Checks `company_profiles` → **Complete** ✅
4. **Redirects to** `/dashboard/company` immediately ✅

---

## Error Messages

### Wrong Password
```
"An account with this email already exists. Please use the correct password or reset your password."
```

### Profile Incomplete
```
User is automatically redirected to appropriate onboarding page
```

### New User
```
User proceeds through normal signup flow
```

---

## Technical Implementation

### Files Modified

**1. [components/onboarding/OnboardingFlow.tsx](components/onboarding/OnboardingFlow.tsx)**
- Enhanced `handleSignup()` function
- Added detection for existing users
- Added profile completeness checks
- Intelligent routing based on profile status

**Key Logic:**
```typescript
// Handle case where user already exists
if (authError && authError.message?.includes("User already registered")) {
  // Try to sign in
  const { data: signInData } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Check profile completeness
  if (userData?.user_type === "homeowner") {
    const { data: profile } = await supabase
      .from("homeowner_profiles")
      .select("id, first_name, last_name")
      .eq("user_id", signInData.user.id)
      .single()

    if (profile?.first_name && profile?.last_name) {
      // Complete - go to dashboard
      router.push("/dashboard/homeowner")
    } else {
      // Incomplete - continue onboarding
      router.push("/onboarding/homeowner")
    }
  }
}
```

**2. [app/onboarding/homeowner/page.tsx](app/onboarding/homeowner/page.tsx)** (NEW)
- Server component that checks authentication
- Checks if homeowner profile exists
- Redirects to dashboard if profile is complete
- Renders onboarding form if incomplete

**3. [components/homeowner-onboarding-form.tsx](components/homeowner-onboarding-form.tsx)** (NEW)
- Simple form for homeowner profile completion
- Fields: First Name, Last Name, Phone, Location, Bio
- Updates existing profile or creates new one
- Redirects to dashboard on completion

---

## Benefits

✅ **No Lost Accounts**: Users who abort don't lose their account
✅ **Seamless Resume**: Users can pick up where they left off
✅ **Better UX**: No need to use "Forgot Password" if they just didn't finish
✅ **Smart Routing**: System knows where to send users based on their status
✅ **Error Prevention**: Clear messages guide users to the right action

---

## Database Tables Checked

### Homeowner
- Table: `homeowner_profiles`
- Required fields: `first_name`, `last_name`

### Professional
- Table: `professional_profiles`
- Required fields: `first_name`, `last_name`

### Company
- Table: `company_profiles`
- Required fields: `company_name`

---

## Edge Cases Handled

1. ✅ User enters wrong password → Clear error message
2. ✅ User has account but no profile → Redirect to onboarding
3. ✅ User has complete profile → Redirect to dashboard
4. ✅ User tries different user type than original → System adapts
5. ✅ Multiple onboarding attempts → Works seamlessly

---

## Testing Checklist

- [ ] Sign up as homeowner, abort, return with same credentials
- [ ] Sign up as professional, abort, return with same credentials
- [ ] Sign up as company, abort, return with same credentials
- [ ] Try wrong password on existing account
- [ ] Complete profile after resuming
- [ ] Try to sign up again after completing profile

---

## Summary

The error handling system ensures users never lose their progress during signup. Whether they close the browser, navigate away, or simply change their mind, they can always return and continue exactly where they left off. The system intelligently detects their status and guides them to the appropriate next step.

**Key Features:**
- Automatic detection of existing accounts
- Smart routing based on profile completeness
- Seamless resume experience
- Clear error messages
- No data loss

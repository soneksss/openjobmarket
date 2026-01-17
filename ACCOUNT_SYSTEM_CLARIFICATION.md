# Account System Clarification

## Core Principle: One Email = One Account = One Profile Type

**Important**: You CANNOT have multiple accounts with the same email address. Each email gets exactly ONE account with ONE profile type.

## Account Types

### Individual Accounts (`account_type = 'individual'`)

**Profile Tables Used**:
- `professional_profiles` - For jobseekers who need CV, applications, etc.
- `homeowner_profiles` - For homeowners who only post trade jobs

**User Roles (Feature Flags)**:
- `is_jobseeker = true` - Can apply to jobs, build CV
- `is_homeowner = true` - Can post trade jobs, hire tradespeople

**Multi-Role Example**:
- User can be BOTH jobseeker AND homeowner (same account, same profile)
- They have `is_jobseeker=true` and `is_homeowner=true`
- They have ONE `professional_profiles` entry
- They can access both jobseeker features AND homeowner features

### Business Accounts (`account_type = 'company'`)

**Profile Table Used**:
- `company_profiles` - For companies, self-employed, agencies

**User Types**:
- Company Owner → `company_profiles`
- Agency → `company_profiles`
- Self-Employed / Tradesperson → `company_profiles`

**User Roles (Feature Flags)**:
- `is_employer = true` - Can post job vacancies, hire employees
- `is_tradespeople = true` - Can apply to trade jobs (if self-employed)

**Multi-Role Example**:
- Self-employed tradesperson has `is_employer=true` AND `is_tradespeople=true`
- They have ONE `company_profiles` entry
- They can post job vacancies AND apply to trade jobs

## Profile Type Decision Logic

The trigger uses `account_type` as the PRIMARY decision factor:

```
IF account_type = 'company' THEN
  → Create company_profiles (Business account)

ELSE IF account_type = 'individual' THEN
  IF is_jobseeker = true THEN
    → Create professional_profiles (Jobseeker)
  ELSE IF is_homeowner = true THEN
    → Create homeowner_profiles (Homeowner only)
  ELSE
    → Create professional_profiles (Default)
  END IF
END IF
```

## Signup Scenarios

### Scenario 1: Jobseeker Only
```
Email: jobseeker@example.com
account_type: individual
is_jobseeker: true
is_homeowner: false

Result:
✅ professional_profiles created
✅ Can apply to jobs, build CV
❌ Cannot post trade jobs (unless they also have is_homeowner=true)
```

### Scenario 2: Jobseeker + Homeowner (Multi-Role)
```
Email: multirole@example.com
account_type: individual
is_jobseeker: true
is_homeowner: true

Result:
✅ professional_profiles created (ONE profile)
✅ Can apply to jobs, build CV (jobseeker features)
✅ Can post trade jobs (homeowner features)
```

### Scenario 3: Homeowner Only
```
Email: homeowner@example.com
account_type: individual
is_jobseeker: false
is_homeowner: true

Result:
✅ homeowner_profiles created
✅ Can post trade jobs, hire tradespeople
❌ Cannot apply to jobs (unless they also have is_jobseeker=true)
```

### Scenario 4: Company Owner
```
Email: company@example.com
account_type: company
is_employer: true
company_name: "Acme Corp"

Result:
✅ company_profiles created
✅ Can post job vacancies, hire employees
✅ Company dashboard access
```

### Scenario 5: Self-Employed Tradesperson
```
Email: selfemployed@example.com
account_type: company
is_employer: true
is_tradespeople: true
company_name: "John's Plumbing"

Result:
✅ company_profiles created (ONE profile)
✅ Can post job vacancies (employer features)
✅ Can apply to trade jobs (tradespeople features)
✅ Company dashboard access (as business account)
```

## Account Conversion (NOT Allowed with Same Email)

### ❌ WRONG: Creating New Account with Same Email

```
Step 1: User creates jobseeker account
  Email: user@example.com
  account_type: individual
  Profile: professional_profiles

Step 2: User wants to become a company
  ❌ CANNOT create new account with user@example.com
  ❌ Email already exists in auth.users
  ❌ Will be rejected by Supabase Auth
```

### ✅ CORRECT: Account Upgrade/Conversion

```
Step 1: User creates jobseeker account
  Email: user@example.com
  account_type: individual
  Profile: professional_profiles

Step 2: User wants to become a company
  ✅ Use account upgrade feature (to be implemented)
  ✅ Update account_type from 'individual' to 'company'
  ✅ Delete professional_profiles, create company_profiles
  ✅ Update is_employer flag
  ✅ Same email, same auth account, different profile type
```

**Note**: Account conversion functionality needs to be implemented. Users cannot currently convert individual accounts to business accounts (or vice versa) without creating a new account with a different email.

## Database Constraints

### Email Uniqueness (Enforced by Supabase Auth)
- `auth.users.email` - UNIQUE constraint
- One email can only exist ONCE in auth.users
- Signup with existing email will fail

### Profile Uniqueness (Enforced by Database)
- `professional_profiles.user_id` - UNIQUE constraint
- `company_profiles.user_id` - UNIQUE constraint
- `homeowner_profiles.user_id` - UNIQUE constraint
- One user_id can only have ONE profile in EACH table

### Multi-Profile Prevention
The signup trigger creates ONLY ONE profile:
- Uses `IF...ELSIF...ELSE` (mutually exclusive)
- Based on `account_type` (primary decision factor)
- Cannot create both professional AND company profiles for same user

## Quick Check Modal → Profile Mapping

| User Selection | account_type | Role Flags | Profile Created |
|---|---|---|---|
| 🏠 Homeowner | individual | is_homeowner=true | homeowner_profiles |
| 💼 Employed | individual | is_jobseeker=true, is_homeowner=true | professional_profiles |
| 🔍 Unemployed | individual | is_jobseeker=true, is_homeowner=true | professional_profiles |
| 🔧 Self-Employed | company | is_employer=true, is_tradespeople=true | company_profiles |
| 🏢 Company Owner | company | is_employer=true | company_profiles |
| 🏬 Agency | company | is_employer=true | company_profiles |
| 👀 Just Browsing | individual | is_homeowner=true | homeowner_profiles |

## Key Takeaways

1. ✅ One email = One account = One profile type
2. ✅ Multi-role = Multiple feature flags, NOT multiple profiles
3. ✅ Individual accounts use professional_profiles or homeowner_profiles
4. ✅ Business accounts use company_profiles
5. ✅ account_type determines profile type (primary decision)
6. ✅ Role flags (is_jobseeker, is_homeowner, etc.) determine feature access
7. ❌ Cannot create multiple accounts with same email
8. ❌ Cannot have both professional AND company profiles for same user
9. ⚠️ Account conversion (individual ↔ company) requires upgrade feature (TBD)

## Implementation Status

✅ Signup trigger creates ONE profile based on account_type
✅ Multi-role users supported (multiple flags, one profile)
✅ Orphaned record cleanup for re-signup
✅ Default values for NOT NULL fields
❌ Account upgrade/conversion feature (not yet implemented)

---

**Last Updated**: 2026-01-17

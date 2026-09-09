<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

[← Back to Main README](../../README.md)

# Adding Users

GROW2 authenticates against a Cognito User Pool. The post-deployment seeder creates a
single demo account (`test_user@example.com`); everyone else is added one of two ways.

MFA is mandatory either way. The user pool is configured with `mfaConfiguration: ON` and
`SOFTWARE_TOKEN_MFA` only, so every user must register an authenticator app on first
login — including users an administrator creates. SMS is not enabled.

---

## Option 1: Self-signup through the app

Self-registration is enabled. On the login page, **Create account** takes the user
through email, password, an emailed verification code, and then MFA enrolment. Full
walkthrough in [First Login Guide](FIRST_LOGIN.md#step-2-choose-your-login-method).

This is the right path for most cases — no admin action, and no AWS console access needed.

Passwords follow the Amplify default policy: at least 8 characters with uppercase,
lowercase, a number and a symbol.

---

## Option 2: Create a user as an administrator

Use this when you need to provision an account for someone without letting them
self-register, or when email delivery is not available.

```bash
REGION=us-east-1
EMAIL=researcher@example.com

USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --region $REGION \
  --query 'UserPools[?contains(Name,`grow2`)].Id' --output text)
echo "user pool: $USER_POOL_ID"

# Create the user. MessageAction=SUPPRESS skips the invitation email — drop it if you
# want Cognito to email a temporary password instead.
aws cognito-idp admin-create-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
  --message-action SUPPRESS \
  --region $REGION

# Set a permanent password so the user is not forced through a temporary-password reset.
aws cognito-idp admin-set-user-password \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --password 'ChangeMe123!' \
  --permanent \
  --region $REGION
```

This mirrors what the seeder does for the demo account, so it is a known-good sequence.

Give the user the email and password out of band and have them change it after first
login. They will be prompted to enrol MFA when they sign in.

### Verify

```bash
aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" --region $REGION \
  --query '[Username,UserStatus]' --output text
```

`CONFIRMED` means ready to log in. The `Username` value is the Cognito user ID (a UUID)
— not the email — and it is what the application uses as `userId` in DynamoDB.

---

## After the user exists: they need a profile

A new user starts with **no research profile and no agent configuration**. The seeder
only creates those for the demo account. Until the user creates a profile:

- Grant matching has nothing to score against
- Agent discovery has no keywords to search with, and will not surface anything

Have them complete
[Step 8 of the First Login Guide](FIRST_LOGIN.md#step-8-complete-your-researcher-profile-new-accounts-only),
then set up **Agent Config** and select that profile.

Which profile fields actually drive matching — and why broad keywords beat narrow ones —
is covered in [How Bayesian Matching Works](../reference/HOW_BAYESIAN_MATCHING_WORKS.md).

---

## Removing a user

Deleting the Cognito user does not remove their data. Their `UserProfile`, `AgentConfig`,
grant records and proposals remain in DynamoDB and S3, keyed by the Cognito user ID.
Capture that ID before deleting the user if you intend to clean up afterwards.

```bash
aws cognito-idp admin-delete-user --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" --region $REGION
```

---

## Related Documentation

- [First Login Guide](FIRST_LOGIN.md) — MFA setup and initial profile
- [Manual Agent Discovery](MANUAL-AGENT-DISCOVERY.md) — finding a user's ID and config ID
- [How Bayesian Matching Works](../reference/HOW_BAYESIAN_MATCHING_WORKS.md)

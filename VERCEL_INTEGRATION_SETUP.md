# Vercel Integration Setup for PR Previews

This document explains how to configure the integration between your fly.io websocket server deployments and Vercel webapp deployments for PR previews.

## Overview

When a PR is opened:
1. GitHub Action deploys the websocket server to fly.io with URL: `wss://pr-{PR_NUMBER}-{OWNER}-{REPO}.fly.dev`
2. GitHub Action updates Vercel environment variables with the websocket server URL
3. GitHub Action triggers a Vercel redeployment to pick up the new environment variable
4. Your webapp now correctly connects to the PR-specific websocket server

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. VERCEL_TOKEN
- **Description**: Vercel API token for authentication
- **How to get**: 
  1. Go to [Vercel Dashboard → Settings → Tokens](https://vercel.com/account/tokens)
  2. Create a new token with appropriate permissions
  3. Copy the token value

### 2. VERCEL_PROJECT_ID
- **Description**: The unique identifier for your Vercel project
- **How to get**:
  1. Go to your Vercel project dashboard
  2. Go to Settings → General
  3. Copy the "Project ID" value
  
  Alternatively, you can get it via CLI:
  ```bash
  npx vercel ls
  # Find your project and note the ID
  ```

### 3. VERCEL_PROJECT_NAME
- **Description**: The name of your Vercel project
- **How to get**: This is the name you see in your Vercel dashboard for the webapp project

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each of the secrets above with their respective values

## How It Works

### When a PR is Opened or Updated:
1. **Deploy to fly.io**: The websocket server is deployed to fly.io with a predictable URL
2. **Update Vercel Env Var**: A branch-specific environment variable `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` is set in Vercel
3. **Trigger Redeploy**: Vercel is triggered to redeploy the branch to pick up the new environment variable

### When a PR is Closed:
1. **Cleanup**: The branch-specific environment variable is removed from Vercel
2. **fly.io Cleanup**: The fly.io app is automatically destroyed (handled by the fly-pr-review-apps action)

## Vercel Environment Variable Structure

The environment variables are created with these properties:
- **Key**: `NEXT_PUBLIC_WEBSOCKET_SERVER_URL`
- **Value**: `wss://pr-{PR_NUMBER}-{OWNER}-{REPO}.fly.dev`
- **Target**: `preview` (only applies to preview deployments)
- **Git Branch**: Specific to the PR branch

## Troubleshooting

### If the integration isn't working:

1. **Check GitHub Action logs**: Look for errors in the "Update Vercel Environment Variable" step
2. **Verify secrets**: Ensure all GitHub secrets are correctly configured
3. **Check Vercel logs**: Look at your Vercel deployment logs for environment variable issues
4. **Manual verification**: You can manually check if the environment variable was set in Vercel dashboard

### Common Issues:

- **403 Forbidden**: Usually means the `VERCEL_TOKEN` doesn't have sufficient permissions
- **404 Not Found**: Usually means the `VERCEL_PROJECT_ID` is incorrect
- **Environment variable not taking effect**: The Vercel redeployment step might have failed

## Testing

To test this integration:
1. Create a test PR
2. Watch the GitHub Action complete successfully
3. Check that the Vercel preview deployment has the correct `NEXT_PUBLIC_WEBSOCKET_SERVER_URL`
4. Verify that the webapp can connect to the websocket server

## Alternative Approach (Simpler but Less Dynamic)

If you prefer a simpler approach, you could:
1. Use a predictable URL pattern in your webapp code
2. Calculate the fly.io URL based on the Git branch name or PR number
3. This avoids needing to update Vercel environment variables

Example in your webapp:
```typescript
// In your webapp code
const getPRWebsocketURL = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'ws://localhost:8081';
  }
  
  // For PR previews, calculate the URL based on branch or PR number
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  if (branch && branch.startsWith('pr-')) {
    const prNumber = branch.replace('pr-', '');
    return `wss://pr-${prNumber}-${owner}-${repo}.fly.dev`;
  }
  
  // Fallback to environment variable for production
  return process.env.NEXT_PUBLIC_WEBSOCKET_SERVER_URL;
};
``` 
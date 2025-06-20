---
sidebar_position: 1
---

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

### 4. VERCEL_TEAM_ID
- **Description**: The unique identifier for your Vercel team (required for team projects)
- **How to get**:
  1. Go to your Vercel team dashboard
  2. Go to Settings → General
  3. Copy the "Team ID" value
  
  Alternatively, you can get it via CLI:
  ```bash
  npx vercel teams ls
  # Find your team and note the ID
  ```
  
  **Note**: This is required because your project belongs to a team rather than your personal account. Team projects require the `teamId` parameter in API calls.

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

## GitHub Actions Workflow

The integration uses a GitHub Actions workflow that:

1. **Detects PR Events**: Triggers on PR open, sync, and close
2. **Deploys WebSocket Server**: Uses fly.io for websocket server deployment
3. **Updates Vercel**: Sets environment variables and triggers redeployment
4. **Cleanup**: Removes resources when PR is closed

### Example Workflow Configuration

```yaml
name: Deploy PR Preview

on:
  pull_request:
    types: [opened, synchronize, closed]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to fly.io
        # Deploy websocket server to predictable URL
        
      - name: Update Vercel Environment
        # Set NEXT_PUBLIC_WEBSOCKET_SERVER_URL
        
      - name: Trigger Vercel Redeploy
        # Force redeployment to pick up new env vars
```

## Troubleshooting

### If the integration isn't working:

1. **Check GitHub Action logs**: Look for errors in the "Update Vercel Environment Variable" step
2. **Verify secrets**: Ensure all GitHub secrets are correctly configured
3. **Check Vercel logs**: Look at your Vercel deployment logs for environment variable issues
4. **Manual verification**: You can manually check if the environment variable was set in Vercel dashboard

### Common Issues:

**403 Forbidden**
- Usually means the `VERCEL_TOKEN` doesn't have sufficient permissions
- Ensure the token has project access permissions

**404 Not Found**
- Usually means the `VERCEL_PROJECT_ID` is incorrect
- Verify the project ID from your Vercel dashboard

**Project not found**
- Usually means you're missing the `VERCEL_TEAM_ID` for team projects
- The error occurs when your project belongs to a team but you don't provide the `teamId` parameter

**Environment variable not taking effect**
- The Vercel redeployment step might have failed
- Check that the workflow triggered a successful redeployment

### Team vs Personal Projects

If your project belongs to a team (as indicated by team sections in your Vercel dashboard), you **must** include the `VERCEL_TEAM_ID` secret. The error "Project not found" occurs when:
- Your project belongs to a team but you don't provide the `teamId` parameter
- Your token doesn't have access to the team
- The team ID is incorrect

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

## Benefits

- **Isolated Testing**: Each PR gets its own environment
- **Automatic Setup**: No manual configuration needed
- **Clean Cleanup**: Resources automatically removed when PR is closed
- **Production-like**: Preview environments match production architecture
- **Team Collaboration**: Easy for reviewers to test changes

This integration ensures that every PR can be fully tested with its own dedicated infrastructure, making the review process more reliable and comprehensive. 
# AI Phone Screen Practice

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/acedit-ai/phone-screen?utm_source=oss&utm_medium=github&utm_campaign=acedit-ai%2Fphone-screen&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai/github/acedit-ai/phone-screen)

An open-source project to simulate job interview phone screens using OpenAI's Realtime API and Twilio. Practice your interviewing skills with an AI that calls you!

![Screenshot 2025-05-23 at 5 46 08 pm](https://github.com/user-attachments/assets/4c6333ad-eadc-4617-927c-7a43901a441d)

## Supported Regions

This application currently supports outbound calls to three regions:

| Region | Flag | Country Code | Example |
|--------|------|--------------|---------|
| United States | 🇺🇸 | +1 | +1 (555) 123-4567 |
| Australia | 🇦🇺 | +61 | +61 4XX XXX XXX |
| India | 🇮🇳 | +91 | +91 XXXXX XXXXX |

### Why Regional Phone Numbers?

**Using local phone numbers for each region dramatically improves call success rates:**

✅ **Higher Connection Rates**: Local numbers are less likely to be blocked by carriers  
✅ **No International Restrictions**: Bypasses carrier limitations on international calls  
✅ **Better Trust**: Recipients are more likely to answer calls from local numbers  
✅ **Reduced Costs**: Local rates instead of international calling fees  
✅ **Compliance**: Meets regional telecommunications regulations  

**Without regional numbers**, you may experience:
- Calls going straight to voicemail
- Carrier blocking international calls
- Higher costs and lower success rates

## Quick Setup

Open three terminal windows:

| Terminal | Purpose                       | Quick Reference (see below for more) |
| -------- | ----------------------------- | ------------------------------------ |
| 1        | To run the `webapp`           | `npm run dev`                        |
| 2        | To run the `websocket-server` | `npm run dev`                        |
| 3        | To run `ngrok`                | `ngrok http 8081`                    |

Make sure all vars in `webapp/.env` and `websocket-server/.env` are set correctly. See [full setup](#full-setup) section for more.

**⚠️ Important:** For local development, both the `webapp` and `websocket-server` need to use the **same ngrok HTTPS URL** in their environment files!

## Overview

This repo implements an AI phone interviewer using OpenAI's Realtime API and Twilio. Users enter their phone number in the webapp, and the AI calls them for a mock interview session.

The system has two main parts: the `webapp`, and the `websocket-server`.

1. `webapp`: NextJS app that handles outbound calling and serves as a frontend for call configuration and transcripts
2. `websocket-server`: Express backend that handles connection from Twilio, connects it to the Realtime API, and forwards messages to the frontend

<img width="1514" alt="Screenshot 2024-12-20 at 10 32 40 AM" src="https://github.com/user-attachments/assets/61d39b88-4861-4b6f-bfe2-796957ab5476" />

When a user wants to start an interview, the webapp makes an outbound call via Twilio. Twilio uses TwiML (a form of XML) to specify how to handle the call, connecting it to our websocket server for real-time AI interaction.

```xml
<!-- TwiML to start a bi-directional stream-->

<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Hello! You've connected to your AI interview practice session. Please wait a moment while we connect you to your interviewer.</Say>
  <Connect>
    <Stream url="{{WS_URL}}" />
  </Connect>
  <Say>Thank you for using our AI interview practice. Have a great day!</Say>
</Response>
```

We use `ngrok` to make our server reachable by Twilio.

### Life of a phone call

Setup

1. We run ngrok to make our server reachable by Twilio
1. We set the Twilio webhook to our ngrok address
1. Frontend connects to the backend (`wss://[your_backend]/logs`), ready for a call

Call

1. User enters their phone number in the webapp and clicks "Start Interview"
1. Webapp validates the phone number is from a supported region (US, AU, IN)
1. System selects the appropriate regional Twilio phone number for the call
1. Webapp makes an API call to initiate an outbound call via Twilio
1. Twilio calls the user's number using the local regional number and queries the webhook (`http://[your_backend]/twiml`) for TwiML instructions
1. Twilio opens a bi-directional stream to the backend (`wss://[your_backend]/call`)
1. The backend connects to the Realtime API, and starts forwarding messages:
   - between Twilio and the Realtime API
   - between the frontend and the Realtime API

### Function Calling

This demo mocks out function calls so you can provide sample responses. In reality you could handle the function call, execute some code, and then supply the response back to the model.

## Full Setup

1. Make sure your [auth & env](#detailed-auth--env) is configured correctly.

2. **Purchase Regional Phone Numbers in Twilio** (see [Regional Setup](#regional-phone-number-setup))

3. **Set up ngrok and get your public URL:**
   ```shell
   ngrok http 8081
   ```
   Copy the `Forwarding` URL (e.g., `https://abc123.ngrok-free.app`)

4. **Configure environment variables:**
   - In `websocket-server/.env`, set `PUBLIC_URL=https://abc123.ngrok-free.app`
   - In `webapp/.env`, set `NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://abc123.ngrok-free.app`
   
5. Run websocket server:
   ```shell
   cd websocket-server
   npm install
   npm run dev
   ```

6. Run webapp:
   ```shell
   cd webapp
   npm install
   npm run dev
   ```

**🔥 Pro tip:** Keep ngrok running throughout your development session. If you restart ngrok, you'll get a new URL and need to update both environment files!

## Regional Phone Number Setup

### Why You Need Regional Numbers

The application requires **local phone numbers for each supported region** to ensure reliable call delivery:

- **US calls**: Require a US Twilio phone number
- **Australian calls**: Require an Australian Twilio phone number  
- **Indian calls**: Require an Indian Twilio phone number

### Purchasing Regional Numbers

1. **Log into Twilio Console**: https://console.twilio.com/us1/develop/phone-numbers/manage/search

2. **For Australia (+61)**:
   - Select "Australia" from country dropdown
   - Choose "Voice" capability
   - Purchase a local Australian number
   - Cost: ~$1-3/month

3. **For India (+91)**:
   - Select "India" from country dropdown
   - Choose "Voice" capability
   - Purchase a local Indian number
   - **Note**: May require identity verification documents
   - Cost: ~$1-3/month

4. **For United States (+1)**:
   - You may already have this from initial Twilio setup
   - If not, purchase any US number with Voice capability

### Configuration

After purchasing, add the phone numbers to your environment variables:

```env
# Regional Phone Numbers (E.164 format with + prefix)
TWILIO_PHONE_NUMBER_US=+1XXXXXXXXXX   # US number (required - used as fallback)
TWILIO_PHONE_NUMBER_AU=+61XXXXXXXXX   # Australian number (optional)
TWILIO_PHONE_NUMBER_IN=+91XXXXXXXXXX  # Indian number (optional)
```

### Fallback Mechanism

**Smart Fallback System**: If a regional phone number is not configured, the system automatically uses the US number as a fallback:

- **US calls**: Always use the configured US number
- **Australian calls**: Use AU number if configured, otherwise fallback to US number
- **Indian calls**: Use IN number if configured, otherwise fallback to US number

**Benefits:**
- ✅ **Always functional**: Calls work even without regional numbers
- ✅ **Gradual rollout**: Start with US number, add regional numbers over time  
- ✅ **Cost control**: Only buy regional numbers when needed
- ✅ **Graceful degradation**: International calls still work (may have lower success rates)

**Example scenarios:**
```bash
# Scenario 1: Only US number configured
TWILIO_PHONE_NUMBER_US=+1234567890
# Result: All regions use +1234567890

# Scenario 2: US + Australian numbers configured  
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61987654321
# Result: US uses +1234567890, AU uses +61987654321, IN uses +1234567890 (fallback)

# Scenario 3: All regional numbers configured
TWILIO_PHONE_NUMBER_US=+1234567890
TWILIO_PHONE_NUMBER_AU=+61987654321  
TWILIO_PHONE_NUMBER_IN=+91123456789
# Result: Each region uses its local number
```

### Region Validation

The application automatically:
- **Detects the user's region** from their phone number
- **Selects the appropriate local number** for the outbound call
- **Blocks unsupported regions** with helpful error messages

**Supported Detection Logic:**
- **US**: Numbers starting with +1 (11 digits total)
- **Australia**: Numbers starting with +61 (10+ digits total)
- **India**: Numbers starting with +91 (12+ digits total)

## Detailed Auth & Env

### Webapp Environment Variables

The `webapp` requires the following environment variables in `webapp/.env`:

**For Local Development:**
```env
# Twilio Configuration (for outbound calling)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Regional Phone Numbers (E.164 format)
TWILIO_PHONE_NUMBER_US=+1XXXXXXXXXX
TWILIO_PHONE_NUMBER_AU=+61XXXXXXXXX  # Optional: Leave empty if not supporting AU
TWILIO_PHONE_NUMBER_IN=+91XXXXXXXXXX # Optional: Leave empty if not supporting IN

# WebSocket Server URL - Use your ngrok URL for local development
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://your-unique-id.ngrok-free.app
```

**For Production:**
```env
# Twilio Configuration (for outbound calling)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Regional Phone Numbers (E.164 format)
TWILIO_PHONE_NUMBER_US=+1XXXXXXXXXX
TWILIO_PHONE_NUMBER_AU=+61XXXXXXXXX
TWILIO_PHONE_NUMBER_IN=+91XXXXXXXXXX

# WebSocket Server URL - Use your deployed server URL
NEXT_PUBLIC_WEBSOCKET_SERVER_URL=https://your-websocket-server.fly.dev
```

**Important Notes:**
- All phone numbers must be in **E.164 format** (include the `+` sign and country code)
- If a regional number is not configured, users from that region will see an error
- For local development, `NEXT_PUBLIC_WEBSOCKET_SERVER_URL` must use the **ngrok HTTPS URL** (not `ws://localhost:8081`) so the webapp can generate TwiML that Twilio can reach
- The webapp uses this URL to generate the correct websocket endpoints for Twilio's TwiML

### WebSocket Server Environment Variables

The `websocket-server` requires these environment variables in `websocket-server/.env`:

**For Local Development:**
```env
OPENAI_API_KEY=your_openai_api_key
PUBLIC_URL=https://your-unique-id.ngrok-free.app
PORT=8081
```

**For Production:**
```env
OPENAI_API_KEY=your_openai_api_key
PUBLIC_URL=https://your-websocket-server.fly.dev
PORT=8081
```

### Ngrok

Twilio needs to be able to reach your websocket server. If you're running it locally, your ports are inaccessible by default. [ngrok](https://ngrok.com/) can make them temporarily accessible.

We have set the `websocket-server` to run on port `8081` by default, so that is the port we will be forwarding.

```shell
ngrok http 8081
```

Make note of the `Forwarding` URL. (e.g. `https://54c5-35-170-32-42.ngrok-free.app`)

### Websocket URL

Your server should now be accessible at the `Forwarding` URL when run, so set the `PUBLIC_URL` in `websocket-server/.env`. See `websocket-server/.env.example` for reference.

## Deployment with Fly.io

This project is configured for deployment to Fly.io using GitHub Actions. Pushes to the `main` branch will automatically deploy the `websocket-server` to Fly.io, and Pull Requests will generate preview environments.

To get started with Fly.io:

1.  **Install the Fly CLI and Authenticate:**
    *   Install the CLI:
        ```shell
        curl -L https://fly.io/install.sh | sh
        ```
    *   Sign up or log in:
        ```shell
        fly auth signup  # If you don't have an account
        # OR
        fly auth login   # If you already have an account
        ```

2.  **Initialize Your App with Fly.io:**
    *   Navigate to the `websocket-server` directory in your project:
        ```shell
        cd websocket-server
        ```
    *   Launch the app on Fly.io:
        ```shell
        fly launch
        ```
        Follow the prompts. This will detect your Node.js application, ask you to choose an organization and a region. It will also generate a `fly.toml` configuration file and a `Dockerfile` in the `websocket-server` directory. Review these files to ensure they meet your needs.
        *Note: For the hobby plan, ensure you select a region and instance size that aligns with the free tier or your budget.*

3.  **Set Environment Variables for Your Fly.io App:**
    Before deploying, you must set the required environment variables as secrets in Fly.io:
    ```shell
    # Required: OpenAI API key for the Realtime API
    fly secrets set OPENAI_API_KEY=your_openai_api_key
    
    # The PUBLIC_URL will be automatically set to your Fly.io app URL
    # No need to set this manually - it will be https://your-app-name.fly.dev
    ```
    
    **⚠️ Important:** The websocket-server requires the `OPENAI_API_KEY` to function. Without this secret, your deployment will fail to connect to OpenAI's Realtime API.

4.  **Set Up GitHub Actions for Automatic Deployment:**
    The necessary GitHub Actions workflow files (`.github/workflows/deploy.yml` and `.github/workflows/pr-preview.yml`) are already included in this repository. To enable them:
    *   **Generate a Fly.io API Token:**
        The `fly-pr-review-apps` action uses this token to interact with your Fly.io account.
        ```shell
        flyctl auth token
        ```
        Copy the displayed token. The `deploy.yml` workflow for deploying to `main` also uses this token.

    *   **Identify Your Fly.io Organization Name:**
        Your Fly.io applications are scoped to an organization. This is often `personal` for individual accounts. You can find your organization name by:
        *   Logging into the [Fly.io dashboard](https://fly.io/dashboard).
        *   Running the command: `flyctl orgs list`
        Make a note of the organization slug you want to use.

    *   **Store Secrets in GitHub:**
        1.  Go to your GitHub repository's page.
        2.  Click on "Settings".
        3.  In the left sidebar, navigate to "Secrets and variables" > "Actions".
        4.  Click the "New repository secret" button to add `FLY_API_TOKEN`:
            *   Name: `FLY_API_TOKEN`
            *   Secret: Paste the token value you copied.
            *   Click "Add secret".
        5.  Click "New repository secret" again to add `FLY_ORG`:
            *   Name: `FLY_ORG`
            *   Secret: Enter your Fly.io organization name (e.g., `personal` or the slug from `flyctl orgs list`).
            *   Click "Add secret".

Once these steps are completed, any push to the `main` branch will trigger a deployment of the `websocket-server` to Fly.io. Pull requests will also automatically create preview environments.

You can manage your Fly.io applications and view logs via the `flyctl` command-line tool or the [Fly.io dashboard](https://fly.io/dashboard).

### Deploying the Webapp to Vercel

The `webapp` (Next.js frontend) can be easily deployed to Vercel, which offers a seamless experience for Next.js applications, including automatic CI/CD with GitHub.

1.  **Sign up/Log in to Vercel:**
    *   Go to [vercel.com](https://vercel.com/) and sign up for a new account or log in if you already have one. You can use your GitHub account for quick registration.

2.  **Install the Vercel CLI (Optional, but Recommended for Manual Deploys):**
    While Vercel excels with Git integration, the CLI can be useful.
    ```shell
    npm i -g vercel
    ```

3.  **Deploying via Vercel Dashboard (Recommended for CI/CD):**
    *   On your Vercel dashboard, click "Add New..." > "Project".
    *   Connect your GitHub account and select the repository for this project.
    *   Vercel will automatically detect that it's a Next.js application.
    *   Configure the project settings:
        *   **Root Directory:** If your `webapp` is in a subdirectory (e.g., `/webapp`), specify this. Otherwise, Vercel usually detects it correctly.
        *   **Build and Output Settings:** Vercel typically configures these automatically for Next.js.
        *   **Environment Variables:** Add any necessary environment variables (e.g., API keys, your deployed `websocket-server` URL) through the Vercel project settings. Refer to `webapp/.env.example` for variables you might need. For local development, you can sync these variables from your Vercel project by running `npm run fetch-env` in the `webapp` directory (this command is defined in `webapp/package.json` and uses `npx vercel env pull .env.development.local`).
    *   Click "Deploy".
    *   Once set up, Vercel will automatically redeploy your `webapp` whenever you push changes to the connected branch (e.g., `main`) or merge pull requests.

4.  **Deploying Manually with Vercel CLI (Alternative):**
    *   Navigate to the `webapp` directory:
        ```shell
        cd webapp
        ```
    *   Log in to Vercel (if you haven't already):
        ```shell
        vercel login
        ```
    *   Link your project (first time only):
        ```shell
        vercel link
        ```
    *   Deploy to production:
        ```shell
        vercel --prod
        ```
    *   To deploy a preview (non-production):
        ```shell
        vercel
        ```

Your `webapp` will then be deployed, and Vercel will provide you with a URL.

# Additional Notes

This repo isn't polished, and the security practices leave some to be desired. Please only use this as reference, and make sure to audit your app with security and engineering before deploying!

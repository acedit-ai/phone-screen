# AI Phone Screen Practice

[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/acedit-ai/phone-screen?utm_source=oss&utm_medium=github&utm_campaign=acedit-ai%2Fphone-screen&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)](https://coderabbit.ai/github/acedit-ai/phone-screen)

An open-source project to simulate job interview phone screens using OpenAI's Realtime API and Twilio. Practice your interviewing skills with an AI!

<img width="1728" alt="Screenshot 2024-12-18 at 4 59 30 PM" src="https://github.com/user-attachments/assets/d3c8dcce-b339-410c-85ca-864a8e0fc326" />

## Quick Setup

Open three terminal windows:

| Terminal | Purpose                       | Quick Reference (see below for more) |
| -------- | ----------------------------- | ------------------------------------ |
| 1        | To run the `webapp`           | `npm run dev`                        |
| 2        | To run the `websocket-server` | `npm run dev`                        |
| 3        | To run `ngrok`                | `ngrok http 8081`                    |

Make sure all vars in `webapp/.env` and `websocket-server/.env` are set correctly. See [full setup](#full-setup) section for more.

## Overview

This repo implements a phone calling assistant with the Realtime API and Twilio, and had two main parts: the `webapp`, and the `websocket-server`.

1. `webapp`: NextJS app to serve as a frontend for call configuration and transcripts
2. `websocket-server`: Express backend that handles connection from Twilio, connects it to the Realtime API, and forwards messages to the frontend
<img width="1514" alt="Screenshot 2024-12-20 at 10 32 40 AM" src="https://github.com/user-attachments/assets/61d39b88-4861-4b6f-bfe2-796957ab5476" />

Twilio uses TwiML (a form of XML) to specify how to handle a phone call. When a call comes in we tell Twilio to start a bi-directional stream to our backend, where we forward messages between the call and the Realtime API. (`{{WS_URL}}` is replaced with our websocket endpoint.)

```xml
<!-- TwiML to start a bi-directional stream-->

<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connected</Say>
  <Connect>
    <Stream url="{{WS_URL}}" />
  </Connect>
  <Say>Disconnected</Say>
</Response>
```

We use `ngrok` to make our server reachable by Twilio.

### Life of a phone call

Setup

1. We run ngrok to make our server reachable by Twilio
1. We set the Twilio webhook to our ngrok address
1. Frontend connects to the backend (`wss://[your_backend]/logs`), ready for a call

Call

1. Call is placed to Twilio-managed number
1. Twilio queries the webhook (`http://[your_backend]/twiml`) for TwiML instructions
1. Twilio opens a bi-directional stream to the backend (`wss://[your_backend]/call`)
1. The backend connects to the Realtime API, and starts forwarding messages:
   - between Twilio and the Realtime API
   - between the frontend and the Realtime API

### Function Calling

This demo mocks out function calls so you can provide sample responses. In reality you could handle the function call, execute some code, and then supply the response back to the model.

## Full Setup

1. Make sure your [auth & env](#detailed-auth--env) is configured correctly.

2. Run webapp.

```shell
cd webapp
npm install
npm run dev
```

3. Run websocket server.

```shell
cd websocket-server
npm install
npm run dev
```

## Detailed Auth & Env

### OpenAI & Twilio

Set your credentials in `webapp/.env` and `websocket-server` - see `webapp/.env.example` and `websocket-server.env.example` for reference.

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

3.  **Set Up GitHub Actions for Automatic Deployment:**
    The necessary GitHub Actions workflow files (`.github/workflows/deploy.yml` and `.github/workflows/pr-preview.yml`) are already included in this repository. To enable them:
    *   **Generate a Fly.io API Token:**
        ```shell
        flyctl auth token
        ```
        Copy the displayed token.
    *   **Store the Token in GitHub Secrets:**
        1.  Go to your GitHub repository's page.
        2.  Click on "Settings".
        3.  In the left sidebar, navigate to "Secrets and variables" > "Actions".
        4.  Click the "New repository secret" button.
        5.  Name the secret `FLY_API_TOKEN`.
        6.  Paste the token value you copied into the "Secret" field.
        7.  Click "Add secret".

Once these steps are completed, any push to the `main` branch will trigger a deployment of the `websocket-server` to Fly.io. Pull requests will also automatically create preview environments.

You can manage your Fly.io applications and view logs via the `flyctl` command-line tool or the [Fly.io dashboard](https://fly.io/dashboard).

# Additional Notes

This repo isn't polished, and the security practices leave some to be desired. Please only use this as reference, and make sure to audit your app with security and engineering before deploying!

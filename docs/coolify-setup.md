# Coolify Setup

Docker images are built by GitHub Actions and pushed to GHCR (GitHub Container Registry). Coolify pulls the pre-built image rather than building from source, which keeps builds fast.

## One-time setup

### 1. Add GHCR credentials to the server

Coolify 4 has no registry UI — credentials are set by logging in to Docker on the server directly, and Coolify picks them up automatically.

1. Create a GitHub Personal Access Token (PAT) with the `read:packages` scope at <https://github.com/settings/tokens>
2. SSH into your Coolify server and run:
   ```sh
   echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
   ```

### 2. Switch the app to use the pre-built image

1. Open the app in Coolify → **Configuration**
2. Change **Build Pack** to **Docker Image**
3. Set the image to:
   ```
   ghcr.io/mattybalaam/shorpin:latest
   ```

### 3. Set runtime environment variables

These secrets are not baked into the image and must be set in Coolify's **Environment Variables** section:

| Variable                    | Description                                  |
| --------------------------- | -------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `PORT`                      | Port the server listens on (default: `3000`) |

> The `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` values are baked into the client bundle at build time via GitHub Actions secrets — they do not need to be set here.

### 4. Add the deploy webhook to GitHub

1. In Coolify → your app → **Webhooks**, copy the **Deploy Webhook URL**
2. In your GitHub repo → **Settings** → **Secrets and variables** → **Actions**, add:
   - Name: `COOLIFY_WEBHOOK_URL`
   - Value: the webhook URL from above

## How deployments work after setup

```
git push master
  → GitHub Actions runs CI (test, e2e, e2e-supabase)
  → on success: builds Docker image, pushes to ghcr.io/mattybalaam/shorpin:latest
  → calls COOLIFY_WEBHOOK_URL
  → Coolify pulls the new image and redeploys
```

# CampusConnect Deployment

## Deployment Plan

- Netlify builds the Vite/React application from `client` and publishes `dist`.
- Render runs the Express API from `server` using `npm start` and checks `/health`.
- MongoDB Atlas stores application data. No database import or migration runs during deployment.
- GitHub remains the source repository. Connect the existing repository in each host; do not replace its existing `origin` remote.

## Rotate The Exposed Credential

The tracked `server/.env.example` previously contained a credential-bearing Atlas URI and secret-like content is present in its Git history. Treat the Atlas database password in that URI as compromised:

1. In Atlas, rotate the password for the affected database user before deploying.
2. Update any local `server/.env` file and any services using that account. Never paste the URI into GitHub, tickets, chat, or build logs.
3. Keep the new URI only in Render's environment settings and in ignored local environment files.
4. History rewriting is not performed by this project setup. After rotation, coordinate any history cleanup with repository collaborators; rewriting shared history can disrupt their clones.

## MongoDB Atlas

1. Create or select the production cluster and database; do not use a personal Atlas admin account for the app.
2. Create a dedicated database user with a unique password and only `readWrite` access to the CampusConnect database. URL-encode special characters in the password when placing it in the URI.
3. Add the Render service's outbound IP addresses to Atlas Network Access when available. If the selected Render plan does not provide stable outbound IPs, a broad `0.0.0.0/0` rule is less restrictive; use it only with a unique strong database password and review whether the plan supports a tighter network path.
4. Copy the Atlas connection string into Render as `MONGO_URI`. Specify the database name in the URI path.
5. Keep backups enabled and test a restore procedure separately. Deployments do not create, drop, import, or modify production records automatically.

## Render Backend

Create a Node web service connected to the GitHub repository, or use the included `render.yaml` Blueprint:

- Root directory: `server`
- Build command: `npm ci --omit=dev`
- Start command: `npm start`
- Health check path: `/health`
- Runtime: Node.js 22

Set these environment variables in Render. `PORT` is assigned by Render and is read by the server automatically.

| Variable                | Required | Value                                                                                  |
| ----------------------- | -------- | -------------------------------------------------------------------------------------- |
| `NODE_ENV`              | Yes      | `production`                                                                           |
| `MONGO_URI`             | Yes      | Rotated Atlas connection string                                                        |
| `JWT_SECRET`            | Yes      | Random secret with at least 32 characters; generate outside Git                        |
| `JWT_EXPIRES_IN`        | No       | Token lifetime such as `7d`; defaults to `7d`                                          |
| `FRONTEND_ORIGIN`       | Yes      | `https://campus-connect-mauve-beta.vercel.app`; origin only, no path or trailing slash |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary account value, if using Cloudinary uploads                                  |
| `CLOUDINARY_API_KEY`    | Optional | Cloudinary API key, if using Cloudinary uploads                                        |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret, if using Cloudinary uploads                                     |

The server has a local-disk upload fallback, but Render's local filesystem is not persistent across deploys/restarts. Configure Cloudinary for durable production uploads. HOD accounts cannot be created through public registration. An administrator can provision one from a trusted machine with access to the target database: configure `server/.env` with that database's `MONGO_URI`, then run `npm run create-hod` from the `server` directory. The command prompts for the HOD details, hides the password while typing, and hashes it through the User model. Never share or commit the password or database URI.

Login, registration, and contact rate limits currently use per-instance memory. They are suitable for the single-instance deployment baseline; configure a shared rate-limit store before scaling the API to multiple instances.

## Frontend Hosting

The active frontend is hosted on Vercel at `https://campus-connect-mauve-beta.vercel.app`. In Vercel project settings, set the root directory to `client`, framework preset to Vite, build command to `npm run build`, and output directory to `dist`. If deploying this repository to Netlify instead, `netlify.toml` already configures its base directory, build command, output directory, Node version, and SPA fallback.

Set this environment variable in Vercel for Production (and Preview too if previews should use this backend):

| Variable       | Value                                         |
| -------------- | --------------------------------------------- |
| `VITE_API_URL` | `https://campusconnect-6aat.onrender.com/api` |

Trigger a new Vercel deployment after setting it. The `/api` suffix is required because Express mounts application routes under `/api`; without it, requests go to nonexistent paths such as `/auth/login`. Vite variables are bundled into public browser code: only put the API base URL here. Never put MongoDB credentials, JWT secrets, Cloudinary secrets, or other server credentials in `VITE_*` variables.

The Render Blueprint now sets the exact production Vercel origin. Apply/sync the Blueprint and redeploy the API so CORS allows it. Production CORS allows only that configured origin; localhost origins are enabled only outside production. If switching to Netlify, update `FRONTEND_ORIGIN` to the Netlify origin as well.

## Local Environment

Copy `server/.env.example` to the ignored `server/.env` and replace all placeholders locally. `client/.env.example` documents the local `VITE_API_URL`. Never commit `.env`, `.env.*`, or secret files; only placeholder `.env.example` files are allow-listed by `.gitignore`.

Required backend settings are `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_ORIGIN` in production. `PORT` is supplied by Render; `NODE_ENV` and `JWT_EXPIRES_IN` are also configurable. Cloudinary variables are needed only when enabling Cloudinary uploads.

## Verification

From the repository root:

```powershell
Set-Location client
npm ci
npm run lint
npm run build
Set-Location ..\server
npm ci
npm start
```

The API requires valid local `MONGO_URI` and `JWT_SECRET` values to start. Verify `GET /health` returns HTTP 200 after startup. Test registration/login, role-protected routes, event/gallery uploads, and CORS from the deployed Netlify origin before announcing the service.

## GitHub, Release, And Rollback

Confirm `git status` is clean and review the staged diff before pushing through your normal GitHub workflow. This setup does not commit or push changes, change remotes, or force-push. Connect Netlify and Render to the existing repository and use their deploy previews before promoting production.

To roll back application code, redeploy the previous known-good Netlify deploy and Render commit, then restore prior non-secret environment values from the hosts' settings. Do not roll back or alter Atlas data as part of an application rollback. If credentials were exposed, rotate them rather than restoring the compromised value.

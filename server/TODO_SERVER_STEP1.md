# TODO_SERVER_STEP1

## Step 1: app.js server configuration fixes
- [x] Configure CORS with `origin: process.env.CLIENT_URL || "http://localhost:5173"`.

- [x] Keep `express.json()` and `express.urlencoded({ extended: true })`.

- [ ] Ensure routes are mounted (existing + analytics decision).

- [x] Keep `errorHandler` as the last middleware.

- [x] Ensure server listens on `process.env.PORT || 5000`.

- [x] Remove MongoDB connection bypass logic; always call `connectDB()` (except in test if desired).


## Step 2: analytics routes/controller
- [ ] Decide + implement `/api/analytics` route/controller (if required by tests).

## Step 3: env example
- [x] Create `server/.env.example` with required keys (since actual .env content can’t be read by tooling).



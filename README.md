# YouTube Clone

A lightweight YouTube-style video platform built with **React**, **Vite**, and **Express**. Upload videos, watch in multiple qualities, browse channels and subscriptions, and engage with threaded comments, comment votes, notifications, and creator tooling when signed in.

## Table of contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [npm scripts](#npm-scripts)
- [Frontend routes](#frontend-routes)
- [Architecture](#architecture)
- [REST API](#rest-api)
- [Video privacy & visibility](#video-privacy--visibility)
- [Project layout](#project-layout)
- [Demo data & account switch](#demo-data--account-switch)
- [Environment variables](#environment-variables)
- [Notes & limitations](#notes--limitations)
- [Tech stack](#tech-stack)

## Features

### Browse & playback

- **Home** — Searchable video grid (API `GET /api/videos?q=`). Category chips (**All**, **Recently uploaded**, **Live**, **Music**, **Gaming**) filter or sort the **already loaded** list on the client (`Recently uploaded` sorts by date; the others match keywords in title, description, or channel name).
- **Subscriptions** — Feed of new uploads from channels you follow, limited to videos published **after** your subscription date (`GET /api/feed/subscriptions`).
- **History** — Signed-in watch history with links back to videos. Opening a watch page while signed in records a history entry; playback position can be saved via `POST /api/history`.
- **Watch** (`/watch/:id`) — Theater layout by default; **CustomVideoPlayer** (play/pause, seek, volume, fullscreen), quality picker (**360p** / **720p**), and a settings menu for layout. Description, share link, **download** (authenticated), decorative like/dislike buttons (not persisted), and **threaded comments** with voting when signed in.
- **Channels** (`/channel/:userId`) — Creator page with per-channel **theme** (background, font, grid/list layout), milestone **badges**, video grid or list, and a **public comment thread** tab that aggregates comments across that creator’s videos (each item links to the source video).

### Upload & media

- **Upload** — Studio-style drag-and-drop (Multer, up to **2 GB**). Title defaults from filename; optional description; **privacy** on publish: **public**, **unlisted**, or **private**.
- **Processing** — After upload, status is `processing` until [FFmpeg](https://ffmpeg.org/) (and **ffprobe** for duration) finishes: **360p** and **720p** H.264 renditions, **thumbnail** (`thumb.jpg`), and an **original** variant row used for downloads.
- **Download** — Signed-in users who are allowed to view the video can download the **original source file** (`GET /api/videos/:id/download`, `Content-Disposition` attachment).

### Community

- **Comments** — Top-level comments and **replies** (`parentId`) on videos when signed in (`POST /api/videos/:id/comments`).
- **Comment voting** — `POST /api/comments/:commentId/vote` with `{ "direction": "up" | "down" }`. Each comment exposes **score** (net) and **viewerVote** (`up`, `down`, or null). One vote per user per comment; repeating the same direction **removes** the vote; the opposite direction **switches** it.
- **Subscribe** — Follow channels from watch or channel pages (`POST /api/channels/:userId/subscription`); the sidebar lists subscribed channels with quick navigation.
- **Notifications** — In-app list for signed-in users (e.g. comment replies). Mark one read or all read; unread count on the header bell.

### Creator tools

- **Video privacy** — Owner can change visibility after upload: public, unlisted, or private (`PATCH /api/videos/:id/privacy`).
- **Channel theme** — On your own channel, customize **background color**, **font**, and **layout** (`grid` vs `list`) via `PATCH /api/channels/me/theme`.
- **Channel badges** — Computed automatically from ready videos on the channel: **100 Videos**, **10K Views** (total views across those videos).

### Auth

- **Magic-link login** — Passwordless tokens in `/login/:token`. On first run the server creates **Default Channel** and writes browser + API magic URLs to **`DEFAULT_LOGIN_URL.txt`** (gitignored).
- **Session** — HttpOnly `session` cookie; `GET /api/auth/me` returns the current user or `null`.
- **Switch account** — Avatar menu **Switch account** for users with `quick_switch` enabled (Default Channel plus demo personas). `POST /api/auth/switch/:userId` swaps the session; the SPA reloads on the same route.

## Prerequisites

- **Node.js** (LTS recommended)
- **FFmpeg** and **ffprobe** on your `PATH` (required for uploads you process locally)

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the API and the dev frontend together:

   ```bash
   npm run dev
   ```

   If Node.js is missing (for example in a bare Linux container), `npm run dev` and `npm run server` run **`scripts/run.sh`**, which installs Node via the system package manager and runs **`npm install`** when needed.

   On Windows you can double-click **`start-app.bat`** in the project folder (installs Node via winget if needed, then starts the stack).

3. Open the app — typically **http://localhost:5173** (Vite uses the next free port if 5173 is taken; check the terminal).

4. **Sign in** — After the API starts, open **`DEFAULT_LOGIN_URL.txt`** and follow the `http://localhost:5173/login/...` link (adjust the port if needed). Use **Default Channel** for upload and creator tools.

5. **Upload** a video from **Upload**, then open its watch page. Refresh after processing completes to see qualities and the thumbnail.

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Express API on **:3001** and Vite dev server (via `concurrently`) |
| `npm run server` | API only |
| `npm run build` | Production build of the React app → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) |

**Optional:** verify the download endpoint while the API is running:

```bash
node scripts/verify-download.mjs [videoId] [magicToken]
```

Defaults use a sample video id and magic token; override with values from `data/db.json` or your login file.

## Frontend routes

| Path | Page |
|------|------|
| `/` | Home |
| `/watch/:id` | Watch |
| `/upload` | Upload (requires sign-in) |
| `/subscriptions` | Subscriptions feed |
| `/history` | Watch history |
| `/channel/:userId` | Channel profile |
| `/login/:token` | Magic-link login (redirects or sets session via API) |

## Architecture

| Piece | Role |
|-------|------|
| **Vite + React 19** | SPA with React Router; dev proxy forwards `/api` and `/media` to the backend (`vite.config.js`) |
| **Express 5** (`server/index.js`) | REST API, Multer uploads, cookie sessions, static files under `/media` → `storage/` |
| **JSON store** (`server/store.js`, `data/db.json`) | Users, videos, variants, comments, comment votes, subscriptions, watch history, notifications, channel themes; created at runtime (`data/` is gitignored) |
| **Demo seed** (`server/seed.js`) | Personas, fake channels, demo videos, subscriptions (see below) |
| **Video processor** (`server/videoProcessor.js`) | FFmpeg transcode + thumbnail jobs |
| **`storage/videos/`** | Per-video folders (`original.*`, `360.mp4`, `720.mp4`, `thumb.jpg`; gitignored) |

**Ports:** API **3001**; Vite **5173** (or next available).

## REST API

All JSON endpoints use `credentials: include` from the SPA unless noted. Representative routes:

| Area | Methods & paths |
|------|-----------------|
| **Auth** | `GET /api/auth/me`, `GET|POST /api/auth/magic/:token`, `POST /api/auth/logout`, `GET /api/auth/switchable`, `POST /api/auth/switch/:userId` |
| **Videos** | `GET /api/videos` (`?q=` search), `GET /api/videos/:id` (increments views; optional `?position=` for history), `POST /api/videos/upload` (multipart: `video`, `title`, `description`, `privacy`), `PATCH /api/videos/:id/privacy`, `GET /api/videos/:id/download` |
| **Comments** | `GET /api/videos/:id/comments`, `POST /api/videos/:id/comments` (`body`, optional `parentId`), `POST /api/comments/:commentId/vote` (`direction`: `up` or `down`) |
| **Channels** | `GET /api/channels/:userId`, `GET /api/channels/:userId/videos`, `GET /api/channels/:userId/comments`, `PATCH /api/channels/me/theme`, `POST /api/channels/:userId/subscription` (`subscribe`: boolean) |
| **Feed** | `GET /api/feed/subscriptions`, `GET /api/subscriptions/channels` |
| **History** | `GET /api/history`, `POST /api/history` (`videoId`, optional `positionSec`) |
| **Notifications** | `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` |
| **Setup** | `GET /api/setup/login-url` — JSON with default channel magic links |

## Video privacy & visibility

| Privacy | Home / public listings | Direct link & watch |
|---------|------------------------|---------------------|
| **public** | Shown to everyone | Everyone |
| **unlisted** | Hidden from public home-style lists | Anyone with the link |
| **private** | Hidden | Owner only |

Channel video lists respect the same rules (owners see their unlisted/private uploads). Downloads require sign-in and the same view permission as watching.

## Project layout

```
server/
  index.js           # Express app and routes
  store.js           # JSON persistence and domain logic
  seed.js            # Demo data seeding
  videoProcessor.js  # FFmpeg jobs
src/
  App.jsx, App.css, api.js, main.jsx, index.css
  components/        # Layout, CustomVideoPlayer, VideoCard, Icons
  context/           # AuthProvider
  pages/             # Home, Watch, Upload, Login, Subscriptions, History, Channel
  utils/             # formatViews, relative time, etc.
scripts/
  verify-download.mjs
public/              # favicon, SVG icons
storage/videos/      # Media (gitignored)
data/                # db.json (gitignored)
start-app.bat        # Windows launcher → npm run dev
DEFAULT_LOGIN_URL.txt  # Written on first default user creation (gitignored)
```

## Demo data & account switch

On first API start, `ensureDemoSeed()` runs once (unless data already seeded). With **`RESEED_DEMO=1`**, demo content is cleared and re-generated.

Seeded content includes:

- **Default Channel** plus **10 named personas** (`quick_switch: true`)
- **100** additional fake channels
- Variable demo videos per channel (remote sample MP4 URLs and placeholder thumbs for seeded items)
- Random subscriptions with **subscription timestamps** so the Subscriptions feed only includes uploads **after** you subscribed

Sign in as **Default Channel**, open the avatar menu, and use **Switch account** to jump between quick-switch personas (both actor and target must have `quick_switch`).

Re-seed demo data (API only):

```bash
# PowerShell
$env:RESEED_DEMO='1'; npm run server
```

Then restart `npm run dev` as usual for full stack development.

## Environment variables

| Variable | Effect |
|----------|--------|
| `RESEED_DEMO=1` | Force wipe and re-run demo seed on API startup |

## Notes & limitations

- Upload size limit is **2 GB** (`limits.fileSize` in `server/index.js`).
- Watch page **likes/dislikes** are UI-only and not stored.
- Home category chips do not call separate APIs; they filter the current video list client-side.
- Seeded demo videos stream from a public sample URL; **your uploads** are served from `/media` after local FFmpeg processing.
- `package.json` lists `better-sqlite3`, but persistence is **JSON-only** in `server/store.js` (the SQLite dependency is unused).
- For production: build with `npm run build`, serve `dist/` behind a reverse proxy, run the API as a separate process, and configure CORS and session cookies for your domain.
- UI: dark, YouTube-inspired shell (collapsible sidebar, theater watch layout, per-channel themes on channel pages).

## Tech stack

React 19, Vite 5, React Router 7, Express 5, Multer, cookie-based sessions, UUID, CORS, Oxlint.

# Sahayata Board

A simple, free help-request board for protest sites. People post requests for food, bath/toilet, or medical help. Nearby volunteers see them on a public board, copy details into delivery apps, and mark when they are helping.

Built with **plain HTML, CSS, and JavaScript** on the frontend and a small **Node.js + Express** API that stores data in JSON files.

## Features

- Public board with open requests (no login needed to view or help)
- Request types: Food, Bath/Toilet, Medical
- Volunteers can mark "I am providing help" (one mark per device)
- Requesters log in with username + password (stored in localStorage)
- Copy buttons for name, phone, address, instructions
- Safety guidelines for bath/toilet and food requests
- Requests auto-expire after 36 hours
- Board prioritizes requests with no help at the top

## Project structure

```
sahayata-board/
├── client/          # Static HTML/CSS/JS frontend
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js
│       └── app.js
├── server/          # Express API + JSON storage
│   └── src/
├── data/            # requests.json and users.json (created at runtime)
└── package.json
```

## Run locally

1. Install server dependencies:

```bash
npm run install:server
```

2. Start the app:

```bash
npm start
```

For auto-restart during development:

```bash
npm run dev
```

3. Open [http://localhost:4000](http://localhost:4000)

The server serves both the API (`/api/*`) and the static frontend from the same port.

## How it works

### Storage

- `data/requests.json` — all help requests
- `data/users.json` — username + hashed passwords
- No database required
- A cleanup job runs every hour and also on every read to remove records older than 36 hours

### Auth

- First login with a username creates the account
- Later logins must use the same password
- Session is kept in browser `localStorage`
- Password is sent in request headers for write operations (simple v1 approach)

### API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/requests` | No | List open requests (sorted by priority) |
| GET | `/api/requests/:id` | No | Get one request |
| POST | `/api/requests/:id/help` | No | Mark as helping |
| POST | `/api/auth/login` | No | Login or register |
| GET | `/api/requests/mine` | Yes | Get your requests |
| POST | `/api/requests` | Yes | Create request |
| PUT | `/api/requests/:id` | Yes | Edit your request |
| POST | `/api/requests/:id/fulfill` | Yes | Mark fulfilled |
| DELETE | `/api/requests/:id` | Yes | Delete your request |

## Free deployment options

Since this uses JSON file storage, deploy the **whole app** (server + static files) to a host with persistent disk:

- **Render** free web service (with persistent disk if available)
- **Railway** free tier
- **Fly.io** with a small volume mounted at `/data`
- **A small VPS** with Node.js

Steps (generic):

1. Push this repo to GitHub
2. Create a web service pointing to `server/src/index.js`
3. Set start command: `npm start`
4. Mount persistent storage to the `data/` folder so JSON files survive restarts
5. Set `PORT` from the host environment (most hosts do this automatically)

> Note: Serverless platforms like Vercel/Netlify Functions are not ideal here because JSON files need persistent writable storage. A single small Node server with a disk volume is the simplest free approach.

## Usage flow

### For volunteers

1. Open the site
2. Browse open requests on the Board tab
3. Tap a request to see full details
4. Copy phone/address into Zomato, Swiggy, or your phone dialer
5. Tap **I am providing help**

### For people who need help

1. Tap **+** or go to **My Request**
2. Login with a username and password
3. Fill in request details and post
4. Watch helper count on your request
5. Mark fulfilled or delete when done

## License

Use freely for community help efforts.

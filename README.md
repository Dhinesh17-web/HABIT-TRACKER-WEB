# Habit Tracker Web

Habit Tracker Web is a full-stack app that helps you build daily routines. It covers auth, habit tracking, and reminder delivery. The frontend is a React SPA, and the backend is a Node/Express API with MongoDB.

## What you can do

- Sign up, log in, and manage your profile
- Create habits, mark them complete, edit, or delete
- Get daily reminders by email (SendGrid) or SMS (Twilio)
- Use a secure API with JWT auth and rate limiting

## Tech stack

- React, React Router, Axios
- Node.js, Express, MongoDB (Mongoose)
- JWT + bcrypt for auth
- node-cron + Luxon for scheduled reminders
- SendGrid and Twilio for notifications

## Folder layout

- client/ - React app
- server/ - API server
- render.yaml - Render service config for the API

## Requirements

- Node.js 18+ (recommended)
- A MongoDB connection string

## Run it locally

### 1) Install deps

```bash
cd server
npm install

cd ../client
npm install
```

### 2) Create env files

server/.env

```dotenv
PORT=5000
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
SENDGRID_API_KEY=
SENDGRID_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

client/.env

```dotenv
REACT_APP_API_URL=http://localhost:5000/api
```

SendGrid/Twilio values are optional. If you leave them blank, reminders are skipped.

### 3) Start the apps

API server:

```bash
cd server
npm run dev
```

Client:

```bash
cd client
npm start
```

Client runs at http://localhost:3000 and API at http://localhost:5000.

## API routes

Base: /api

Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- PATCH /api/auth/profile
- POST /api/auth/logout

Habits
- POST /api/habits
- GET /api/habits
- PATCH /api/habits/:id
- PATCH /api/habits/:id/complete
- DELETE /api/habits/:id

## Deployment notes

API (Render)
- render.yaml contains the service config
- Set env vars in Render to match server/.env

Client (Vercel)
- Deploy the client as a static React app
- Set REACT_APP_API_URL to your API URL

## Scripts

Client
- npm start
- npm run build
- npm test

Server
- npm run dev
- npm start

## License

MIT

# Massclick

Massclick is a local business search, lead generation, SEO, and marketing platform. The repository is split into a React frontend and an Express/MongoDB backend, with Socket.IO, Redis, Firebase, PhonePe, MSG91, Google APIs, AWS S3, SSR, and prerendering support.

## What is in this repo

- `client/ui-app` - React application for public pages, user pages, and the admin dashboard
- `server` - Express API, SSR middleware, background jobs, websocket server, and integrations
- `docs/PROJECT_DOCUMENTATION.md` - full project documentation

## Quick Start

1. Install dependencies in both apps.
2. Start the backend.
3. Start the frontend.

```bash
cd server
npm install
node app.js
```

```bash
cd client/ui-app
npm install
npm start
```

## Build

```bash
cd client/ui-app
npm run build
```

The server serves the client build output from the path given in `REACT_BUILD_PATH`.

## Documentation

For the full architecture, route map, environment variables, and development workflow, read:

- [Project Documentation](docs/PROJECT_DOCUMENTATION.md)

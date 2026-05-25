# Attune Backend - Quick Start Guide

## ✅ Backend is Ready!

Your backend is now running and ready to sync data between devices.

## Starting the Backend

```bash
cd backend
./node_modules/.bin/tsc  # Compile TypeScript
node dist/server.js      # Start server
```

The server runs on **http://localhost:3000**

## What's Working

✅ User authentication (signup/login)  
✅ Data upload/download  
✅ Family group management  
✅ JSON-based storage (simple, no database setup needed)

## Next Steps

1. **Keep backend running** - Leave it running in a terminal
2. **Update frontend** - Add login UI and sync functionality
3. **Test multi-user** - You and your wife can both connect

## API Endpoints

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/sync/upload` - Upload your local data
- `GET /api/sync/download` - Download synced data
- `GET /health` - Check if server is running

## Data Storage

Data is stored in `backend/data/` as JSON files:
- `users.json` - User accounts
- `family-groups.json` - Family groups and members
- `app-data.json` - All your Attune data

## Your Data is Safe

- Your local app still works without the backend
- Backend is completely optional
- You can export backups anytime

## Troubleshooting

**Port 3000 already in use?**
```bash
lsof -ti:3000 | xargs kill -9
```

**Need to restart?**
```bash
# Stop: Ctrl+C
# Start: node dist/server.js
```

## Coming Next

- Frontend login UI
- Automatic sync
- Multi-user permissions (parent/caregiver/viewer roles)

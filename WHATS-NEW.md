# What's New: Cloud Sync Feature

## Summary

Your Attune app now has **optional** cloud sync! You can share Robbie's data with your wife while keeping your local app working exactly as before.

## What Changed

### ✅ Your App Still Works the Same
- Open `http://localhost:5173` as usual
- Log events, add notes, everything works
- Data stays in IndexedDB (your browser)
- **Nothing is different unless you use sync**

### ✨ New: Optional Cloud Sync
- New "Cloud Sync" section in Profiles tab
- Create account → Upload data → Share with family
- **Completely optional** - ignore it if you want

## Quick Start

### Option 1: Easy Start (Recommended)
```bash
./start-with-sync.sh
```
This starts both backend and frontend together.

### Option 2: Manual Start
**Terminal 1:**
```bash
cd backend
node dist/server.js
```

**Terminal 2:**
```bash
npm run dev
```

## How to Use Sync

1. **Open app** → Go to Profiles tab
2. **Scroll down** → Find "Cloud Sync (Optional)" card
3. **Sign up** → Create an account
4. **Upload** → Click "Upload Data" to sync
5. **Share** → Your wife can login and download

See `SYNC-TEST-GUIDE.md` for detailed testing instructions.

## Your Data is Safe

✅ Local data never gets deleted  
✅ Sync only copies, doesn't move  
✅ App works offline  
✅ Backend is optional  
✅ Can export backups anytime  

## Files Added

- `backend/` - Server code (Node.js + Express)
- `src/services/sync-service.ts` - Sync logic
- `start-with-sync.sh` - Easy startup script
- `SYNC-TEST-GUIDE.md` - Testing instructions
- `BACKEND-SETUP.md` - Backend details

## What's Next

After testing, you can:
1. **Add your wife** - She creates her own account
2. **Deploy to Render** - Works without your laptop
3. **Add permissions** - Parent vs caregiver roles
4. **Auto-sync** - Sync changes automatically

## Need Help?

- **Backend offline?** Check `backend/` is running
- **Sync not working?** See `SYNC-TEST-GUIDE.md`
- **Want to disable?** Just don't click the sync buttons
- **Data concerns?** Your local data is always safe

## Remember

The sync feature is **completely optional**. Your app works exactly as before. Use sync only when you're ready to share data with your wife.

# Phase 2 Deployment Checklist

## Pre-Deployment
- [ ] Backend is working locally (you've been using it!)
- [ ] You have a Render account
- [ ] You have a GitHub account
- [ ] Your data is backed up (you have the JSON file)

## Backend Deployment
- [ ] Run `./deploy-setup.sh` in backend directory
- [ ] Create private GitHub repo `attune-backend`
- [ ] Push code to GitHub
- [ ] Create Render web service
- [ ] Configure environment variables:
  - [ ] NODE_ENV = production
  - [ ] PORT = 10000
  - [ ] JWT_SECRET = (generated)
- [ ] Add persistent disk (1GB at `/opt/render/project/src/backend/data`)
- [ ] Deploy and wait for success
- [ ] Copy your backend URL: `https://__________________.onrender.com`
- [ ] Test health endpoint: `curl https://your-url.onrender.com/health`

## Frontend Update (I'll do this)
- [ ] Update sync-service.ts to use production URL
- [ ] Add auto-sync functionality
- [ ] Test locally first

## Data Migration
- [ ] Log into localhost:3003
- [ ] Upload your data to production backend
- [ ] Verify data appears correctly

## Testing
- [ ] You can log in on your laptop
- [ ] You can add/edit events
- [ ] Data syncs to backend
- [ ] Your wife can access from her phone (on home WiFi)
- [ ] She can see your data
- [ ] Changes sync between devices

## Optional Upgrades
- [ ] Upgrade to Render paid tier ($7/month) for always-on
- [ ] Add your wife's account
- [ ] Test from outside home WiFi

## Phase 3 Planning (Future)
- [ ] Deploy frontend to Render/Vercel
- [ ] Or build native iOS app with Expo
- [ ] Add push notifications
- [ ] Add offline mode

---

## Current Status

**What's done:**
✅ Backend code ready  
✅ Deployment files created  
✅ Setup script ready  
✅ Documentation complete  

**What you need to do:**
1. Run the setup script
2. Create GitHub repo
3. Deploy to Render
4. Give me your backend URL

**What I'll do next:**
1. Update frontend to use your URL
2. Add auto-sync
3. Help you test

---

## Notes

**Your backend URL will be:** `https://attune-backend-XXXX.onrender.com`

**Free tier limitations:**
- Sleeps after 15 min inactivity
- Takes ~30 sec to wake up
- 750 hours/month free

**When to upgrade to paid ($7/month):**
- When you want instant access (no sleep)
- When using daily with your wife
- When ready for "production" use


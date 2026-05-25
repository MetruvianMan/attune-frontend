# Attune App - Render Deployment Guide

## 🎯 What We're Deploying

**Phase 2:** Backend to Render (cloud hosting)
- Backend runs 24/7 in the cloud
- Frontend stays on your laptop for now (localhost:3003)
- Your data syncs to cloud backend
- Works from anywhere with internet

---

## 📋 Prerequisites

- [x] Render account (you already have one!)
- [x] GitHub account (to push code)
- [x] Backend code ready (✅ done)
- [x] Your current data backed up (✅ you have it)

---

## Step 1: Push Backend to GitHub

### 1.1 Initialize Git in Backend Directory

```bash
cd ~/\~\:Projects\:attune-app/backend
git init
git add .
git commit -m "Initial backend commit for Render deployment"
```

### 1.2 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `attune-backend`
3. Make it **Private** (your data is sensitive!)
4. Don't initialize with README (we already have code)
5. Click "Create repository"

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR-USERNAME/attune-backend.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Render

### 2.1 Create New Web Service

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"**
4. Find and select `attune-backend`

### 2.2 Configure Service

**Basic Settings:**
- **Name:** `attune-backend`
- **Region:** Choose closest to you (e.g., Oregon)
- **Branch:** `main`
- **Root Directory:** leave blank
- **Runtime:** `Node`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Instance Type:**
- Select **Free** (for now)
- Note: Free tier sleeps after 15 min of inactivity

### 2.3 Environment Variables

Click **"Advanced"** and add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | Click "Generate" (Render will create a secure random value) |

### 2.4 Add Persistent Disk (Important!)

1. Scroll to **"Disk"** section
2. Click **"Add Disk"**
3. **Name:** `attune-data`
4. **Mount Path:** `/opt/render/project/src/backend/data`
5. **Size:** `1 GB` (plenty for your data)

### 2.5 Deploy!

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Watch the logs - you should see: `🚀 Attune backend running on http://localhost:10000`

---

## Step 3: Get Your Backend URL

Once deployed, Render gives you a URL like:
```
https://attune-backend.onrender.com
```

**Test it:**
```bash
curl https://attune-backend.onrender.com/health
```

Should return: `{"status":"ok","timestamp":"..."}`

---

## Step 4: Update Frontend to Use Production Backend

I'll update the frontend code to point to your new Render URL instead of localhost:3000.

---

## Step 5: Migrate Your Data

We'll upload your current data from localhost to the production backend:

1. Make sure you're logged into localhost:3003
2. Click **Upload Data** (this sends to production backend now)
3. Your data is now in the cloud!

---

## 🎉 What You'll Have After This

✅ Backend running 24/7 in the cloud  
✅ Your data safely stored on Render  
✅ Frontend on your laptop connects to cloud backend  
✅ Your wife can access via your laptop's IP (on home WiFi)  
✅ Ready for Phase 3 (deploy frontend)

---

## 💰 Cost

**Free Tier:**
- Backend sleeps after 15 min inactivity
- Wakes up in ~30 seconds when accessed
- 750 hours/month free (plenty for testing)

**Paid Tier ($7/month):**
- Always on (no sleep)
- Better for daily use
- Upgrade anytime from Render dashboard

---

## 🔒 Security Notes

- Backend repo is private ✅
- JWT tokens for authentication ✅
- HTTPS encryption ✅
- Data stored on persistent disk ✅
- Environment variables secure ✅

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check Render logs for errors
- Verify environment variables are set
- Make sure disk is mounted correctly

**Can't connect from frontend?**
- Check backend URL is correct
- Verify backend health endpoint works
- Check browser console for CORS errors

**Data not syncing?**
- Make sure you're logged in
- Check backend logs for errors
- Verify JWT token is valid

---

## Next Steps

After backend is deployed:
1. Test sync from your laptop
2. Test from your wife's phone (on home WiFi)
3. Consider upgrading to paid tier ($7/month) for always-on
4. Phase 3: Deploy frontend for full production access


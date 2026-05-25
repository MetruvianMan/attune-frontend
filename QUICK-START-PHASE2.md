# Phase 2: Quick Start Guide

## 🎯 Goal
Deploy backend to Render so it runs 24/7 in the cloud (no laptop needed!)

---

## ⚡ Quick Steps

### 1. Prepare Backend (5 minutes)
```bash
cd ~/\~\:Projects\:attune-app/backend
./deploy-setup.sh
```

### 2. Create GitHub Repo (2 minutes)
1. Go to https://github.com/new
2. Name: `attune-backend`
3. **Make it Private!**
4. Create repository

### 3. Push to GitHub (1 minute)
```bash
git remote add origin https://github.com/YOUR-USERNAME/attune-backend.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Render (10 minutes)
1. Go to https://dashboard.render.com
2. New + → Web Service
3. Connect `attune-backend` repo
4. Configure:
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Add environment variables (see guide)
   - **Add Disk:** `/opt/render/project/src/backend/data` (1GB)
5. Click "Create Web Service"
6. Wait for deployment (~5 min)

### 5. Get Your URL
Copy the URL Render gives you:
```
https://attune-backend-XXXX.onrender.com
```

### 6. Update Frontend
I'll update the frontend code to use your new backend URL.

### 7. Test It!
```bash
curl https://your-backend-url.onrender.com/health
```

Should return: `{"status":"ok"}`

---

## 📞 Tell Me When You're Ready

Let me know when you:
1. ✅ Have your Render backend URL
2. ✅ Health check works
3. ✅ Ready for me to update frontend

Then I'll:
- Update frontend to point to production backend
- Add auto-sync feature
- Help you test with your wife

---

## 🆘 Need Help?

See full guide: `DEPLOYMENT-GUIDE.md`

Common issues:
- **Build fails:** Check Node version (need 18+)
- **Can't push to GitHub:** Check SSH keys or use HTTPS
- **Render deploy fails:** Check logs in Render dashboard


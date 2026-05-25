# Troubleshooting Guide

## Backend Deployment Issues

### Build Fails on Render

**Error:** `npm install` fails
**Solution:**
- Check Node version in Render settings (should be 18+)
- Verify package.json is valid JSON
- Check Render logs for specific error

**Error:** `npm run build` fails
**Solution:**
- Test build locally first: `cd backend && npm run build`
- Check TypeScript errors
- Verify tsconfig.json is correct

### Backend Won't Start

**Error:** "Cannot find module"
**Solution:**
- Verify build command ran successfully
- Check that dist/ directory was created
- Ensure start command is `npm start` not `npm run dev`

**Error:** "Port already in use"
**Solution:**
- Render automatically sets PORT env variable
- Don't hardcode port in server.ts
- Use `process.env.PORT || 3000`

### Data Not Persisting

**Error:** Data disappears after restart
**Solution:**
- Verify persistent disk is mounted
- Check mount path: `/opt/render/project/src/backend/data`
- Ensure disk size is at least 1GB
- Check Render logs for disk mount errors

### Can't Connect to Backend

**Error:** "Failed to fetch" or CORS error
**Solution:**
- Verify backend URL is correct (https://...)
- Check backend health endpoint works
- Ensure CORS is enabled in server.ts
- Check Render service is running (not sleeping)

---

## Frontend Issues

### Can't Log In

**Error:** "Authentication failed"
**Solution:**
- Check backend is running
- Verify JWT_SECRET is set in Render
- Clear browser localStorage and try again
- Check browser console for errors

### Sync Not Working

**Error:** "Upload failed" or "Download failed"
**Solution:**
- Verify you're logged in
- Check backend URL is correct
- Test backend health endpoint
- Check browser console for errors
- Verify JWT token is valid (not expired)

### Images Not Syncing

**Error:** Images don't appear after download
**Solution:**
- Images are stored as base64 in IndexedDB
- Check browser storage isn't full
- Try uploading images again
- Verify backend payload size limit (50MB)

---

## GitHub Issues

### Can't Push to GitHub

**Error:** "Permission denied"
**Solution:**
- Use HTTPS URL: `https://github.com/username/repo.git`
- Or set up SSH keys
- Verify repository exists and you have access
- Check you're logged into correct GitHub account

**Error:** "Repository not found"
**Solution:**
- Verify repository name is correct
- Ensure repository is created on GitHub
- Check repository is not deleted
- Verify you have access (if private)

---

## Render Issues

### Free Tier Sleeping

**Symptom:** First request takes 30+ seconds
**Solution:**
- This is normal for free tier
- Upgrade to paid tier ($7/month) for always-on
- Or accept the wake-up delay

### Deployment Stuck

**Symptom:** Deployment hangs at "Building..."
**Solution:**
- Check Render status page
- Cancel and retry deployment
- Check build logs for errors
- Verify GitHub repo is accessible

### Environment Variables Not Working

**Error:** "JWT_SECRET is not defined"
**Solution:**
- Verify env vars are set in Render dashboard
- Click "Manual Deploy" to trigger redeploy
- Check env var names match exactly (case-sensitive)
- Don't use quotes around values in Render UI

---

## Data Migration Issues

### Upload Fails

**Error:** "Payload too large"
**Solution:**
- Backend supports up to 50MB
- If larger, split data or increase limit
- Check for very large images
- Compress images before upload

### Download Shows Old Data

**Error:** Downloaded data doesn't match uploaded
**Solution:**
- Verify upload completed successfully
- Check you're logged into correct account
- Try logging out and back in
- Check backend logs for errors

---

## Testing Issues

### Can't Access from Wife's Phone

**Error:** "Cannot connect to server"
**Solution:**
- Verify both devices on same WiFi
- Check laptop firewall isn't blocking
- Use laptop's local IP (192.168.x.x)
- Ensure Vite is running on 0.0.0.0 not localhost

### Changes Don't Sync Between Devices

**Error:** Updates don't appear on other device
**Solution:**
- Verify both using same backend URL
- Check both logged into same account
- Try manual refresh (pull down)
- Check backend logs for sync errors

---

## Performance Issues

### App is Slow

**Symptom:** Pages take long to load
**Solution:**
- Check backend is awake (free tier sleeps)
- Verify internet connection
- Check browser console for errors
- Clear browser cache
- Check for large images

### Sync Takes Forever

**Symptom:** Upload/download very slow
**Solution:**
- Check data size (images can be large)
- Verify internet speed
- Try on WiFi instead of cellular
- Check backend isn't overloaded

---

## Getting Help

### Check Logs

**Backend logs (Render):**
1. Go to Render dashboard
2. Click your service
3. Click "Logs" tab
4. Look for errors (red text)

**Frontend logs (Browser):**
1. Open browser dev tools (F12)
2. Click "Console" tab
3. Look for errors (red text)
4. Check "Network" tab for failed requests

### What to Include When Asking for Help

1. **What you were trying to do**
2. **What happened instead**
3. **Error messages** (exact text)
4. **Screenshots** (if helpful)
5. **Backend logs** (from Render)
6. **Browser console logs**

### Contact Points

- **Render Support:** https://render.com/docs
- **GitHub Issues:** (if you make repo public)
- **Me:** Just ask! I'm here to help

---

## Common Questions

**Q: Why is the first request slow?**
A: Free tier sleeps after 15 min. Upgrade to paid for always-on.

**Q: Will I lose data if backend restarts?**
A: No! Data is on persistent disk, survives restarts.

**Q: Can I use a custom domain?**
A: Yes! Render supports custom domains (paid tier).

**Q: How do I backup my data?**
A: Use the Backup button in app, or download from Render disk.

**Q: Can I migrate to a different host?**
A: Yes! Backend is standard Node.js, works anywhere.

**Q: How do I add more users?**
A: They create accounts, then you add them to family group.


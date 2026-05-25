# Testing the Sync Feature

## ✅ What's Ready

Your app now has optional cloud sync! Here's how to test it.

## Step 1: Start Everything

**Terminal 1 - Backend:**
```bash
cd backend
node dist/server.js
```
Should see: `🚀 Attune backend running on http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Should see: `Local: http://localhost:5173`

## Step 2: Open the App

1. Open `http://localhost:5173` in your browser
2. Click **Profiles** (bottom navigation)
3. Scroll down past the Data section
4. You'll see a new **☁️ Cloud Sync (Optional)** card

## Step 3: Test Sync

### Create an Account
1. In the Cloud Sync card, you'll see:
   - Email field
   - Password field  
   - Your Name field
   - Sign Up / Login buttons

2. Fill in:
   - Email: `your-email@example.com`
   - Password: `test123`
   - Name: `Your Name`

3. Click **Sign Up**

### Upload Your Data
1. After signup, you'll see new buttons:
   - ⬆️ Upload Data
   - ⬇️ Download Data
   - Logout

2. Click **⬆️ Upload Data**
3. Confirm the prompt
4. Your Robbie data is now on the server!

### Test Download (Simulating Your Wife's Device)
1. Open a **new incognito/private browser window**
2. Go to `http://localhost:5173`
3. Navigate to Profiles → Cloud Sync
4. **Login** with the same email/password
5. Click **⬇️ Download Data**
6. You'll see all of Robbie's data!

## What This Proves

✅ Your data can sync between devices  
✅ Multiple people can access the same data  
✅ Your local app still works without sync  
✅ Backend stores everything safely

## Important Notes

### Your Local App is Unchanged
- Without clicking sync buttons, everything works as before
- Data stays in your browser
- No internet required

### Sync is Optional
- Only use it when you want to share data
- Can ignore it completely
- Local data is always the source of truth

### Backend Must Be Running
- Backend needs to be running for sync to work
- If backend is off, app shows "Backend offline (local mode only)"
- App continues working locally

## Next Steps

Once you've tested and like it:
1. **Add your wife's account** - She signs up with her own email
2. **Share family group** - (We'll add this feature next)
3. **Deploy to Render** - So it works without your laptop running

## Troubleshooting

**"Backend offline" message?**
- Check backend is running: `curl http://localhost:3000/health`
- Restart backend if needed

**Upload/Download fails?**
- Check browser console (F12) for errors
- Make sure you're logged in
- Try logging out and back in

**Data not showing after download?**
- Page should auto-refresh
- If not, manually refresh (Cmd+R)

## Your Data is Safe

- Local data never gets deleted
- Sync only copies data, doesn't move it
- You can always export backups
- Backend data is in `backend/data/` folder

# Attune Cloud Migration Plan

## Goal
Enable multi-device usage (you + wife) on home WiFi without laptop dependency, while maintaining hot-reload development workflow.

## Current State
- **Dev build** on iPhone connects to Metro bundler on laptop
- Local SQLite database (`dev.db`) on laptop
- Requires laptop awake and running for app to work
- Hot-reload for instant code updates

## Target State
- **Cloud build** works on home WiFi without laptop
- Both you and wife can use app simultaneously
- Shared cloud database (Supabase)
- Dev build continues with hot-reload for development
- Both builds read/write same database = perfect sync

## Migration Steps

### 1. Pre-Migration Safety (30 min)
- ✅ Create fresh timestamped backup of `dev.db`
- ✅ Export data using app's Full Backup feature
- ✅ Store multiple backup copies in safe locations
- ✅ Verify backup integrity

### 2. Cloud Database Setup (1-2 hours)
- Create Supabase account (free tier)
- Set up PostgreSQL database
- Configure database schema (replicate SQLite schema)
- Set up authentication and security rules
- Test database connection

### 3. Data Migration (30 min)
- Export data from local SQLite
- Transform data format if needed (SQLite → PostgreSQL)
- Import data to Supabase
- Verify data integrity and completeness
- Test queries and relationships

### 4. App Configuration (30 min)
- Update app database connection string
- Configure environment variables for cloud database
- Update both dev and cloud builds to use same database
- Test CRUD operations

### 5. Build Cloud App (1 hour)
- Set up EAS Build configuration
- Create production build pointing to cloud database
- Build takes ~20-40 minutes on EAS cloud
- Install on both iPhones via TestFlight or direct install

### 6. Testing & Validation (1 hour)
- Test all features in cloud build
- Verify data appears correctly
- Test multi-device concurrent access
- Confirm backup/restore still works
- Keep dev build as fallback

## Data Sync Strategy

**Recommended: Single Source of Truth**

```
┌─────────────────────┐
│  Supabase Database  │ (single source of truth)
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
Dev Build     Cloud Build
(hot-reload)  (you + wife)
```

- Both builds connect to same cloud database
- Changes in either app appear instantly in both
- No manual sync needed
- Always working with current data

## Development Workflow

**After Migration:**

1. **Daily logging:** Use cloud build (you + wife)
2. **Feature development:** Use dev build with hot-reload
3. **Testing new features:** Test in dev build first (same data!)
4. **Stable features:** Build new cloud version weekly/bi-weekly
5. **Hot-reload preserved:** Dev workflow unchanged

## Safety & Reversibility

- ✅ Local database never deleted or modified
- ✅ Can run both builds side-by-side during transition
- ✅ Can revert to dev build anytime
- ✅ Multiple backup copies stored
- ✅ 100% reversible at every step

## Timeline

| Task | Time | Cumulative |
|------|------|------------|
| Pre-migration backup | 30 min | 30 min |
| Cloud database setup | 1-2 hours | 2.5 hours |
| Data migration | 30 min | 3 hours |
| App configuration | 30 min | 3.5 hours |
| Build cloud app | 1 hour | 4.5 hours |
| Testing & validation | 1 hour | 5.5 hours |

**Total: ~5-6 hours of work**

## Cost

- Supabase free tier: $0/month (2GB database, 500MB file storage)
- Suitable for family use indefinitely
- EAS Build: Free tier includes builds

## Backup Coverage

Current backup functionality already includes:
- ✅ Events
- ✅ Behaviors
- ✅ Rewards  
- ✅ Point Events
- ✅ Diary entries
- ✅ Insights
- ✅ Relationship persons
- ✅ Conversation sessions
- ✅ Documents (full backup)
- ✅ Photos (full backup)

## Next Steps

1. Review this plan
2. Create fresh backup
3. Set up Supabase account
4. Begin migration (estimated 5-6 hours total)

## Future Enhancements

Once stable:
- Add Expo OTA Updates for faster cloud app updates
- Extend to cellular use (already cloud-hosted)
- Add more family members
- Set up automated daily backups

## Questions/Concerns Addressed

- ✅ **Data safety:** Local database preserved, multiple backups
- ✅ **Reversibility:** 100% reversible, can run both builds
- ✅ **Hot-reload:** Dev workflow unchanged
- ✅ **Data sync:** Automatic via shared database
- ✅ **Backup compatibility:** Full coverage of all features
- ✅ **Development speed:** No impact to iteration speed

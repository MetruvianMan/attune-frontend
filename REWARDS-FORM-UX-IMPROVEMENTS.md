# Rewards Form UX Improvements

## Issues Identified (July 16, 2026)

### 1. Limited Emoji Selection
**Current:** Users are limited to 32 predefined emojis in the behavior and reward forms.

**Improvement Needed:** Users should be able to access a full emoji picker if the immediate options don't meet their needs.

**Implementation Ideas:**
- Add a "More emojis..." button that opens a native emoji picker
- Consider using `expo-emoji-picker` or a similar library
- Alternative: Allow text input for emoji (user can paste any emoji from their keyboard)

---

### 2. Time Window Input (Military Time)
**Current:** Time window uses manual text input requiring military time format (e.g., "18:00").

**Improvement Needed:** Should use a native scroll-up/down picker (like iOS time picker) for better UX.

**Implementation Ideas:**
- Use `@react-native-community/datetimepicker` for iOS/Android native time pickers
- Mode: `time`, returns Date object from which you extract hours/minutes
- Format the time as "HH:mm" after selection
- This provides the familiar iOS wheel picker interface

---

### 3. Behavior Persistence Issue (Possible)
**Potential Issue:** User attempted to create first behavior but it may not be persisting due to async timing.

**Investigation Needed:**
- Check if `rewardsService.createBehavior()` completes successfully
- Verify database insert is working
- Confirm the behavior shows up in `behaviors` array after creation
- Add error handling and success feedback to the form submission

---

## Priority
1. **HIGH:** Time picker (major UX issue)
2. **MEDIUM:** Emoji picker (nice-to-have for flexibility)
3. **HIGH:** Persistence debugging (if confirmed as issue)

---

## Notes
- These improvements apply to both behavior-form.tsx and reward-form.tsx
- Consider adding loading states and success toasts after form submission
- May want to add form validation feedback (e.g., "Behavior created successfully!")

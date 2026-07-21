# Chat V2 - Bug Fixes

## Issues Fixed

### 1. "42 events" Numbers Are Dynamic ✅

**Question**: Are the numbers hardcoded?

**Answer**: No! The confidence statement shows real counts from your data:
- Events are counted from `databaseService.getEvents()`
- Documents are counted from `documents.filter(d => selectedDocIds.has(d.id))`
- The AI generates the confidence line based on actual data passed in the prompt

**Example**:
- 5 events + 2 docs → "Medium confidence based on 5 logged events and 2 documents"
- 100 events + 10 docs → "High confidence based on 100 logged events and 10 documents"

The "42 events and 3 documents" was just an example in the documentation.

### 2. Empty "Sensory Overload" Card Fixed ✅

**Problem**: Card showed no preview text, and green uppercase text appeared below

**Root Cause**: 
1. AI didn't provide preview text for that card
2. Parser was capturing "ROBBIE'S INTERACTIONS..." as detailed explanation
3. All-caps text was being treated as content instead of section header

**Fixes Applied**:

#### A. Filter Out Cards Without Preview
```typescript
{cards.filter(card => card.preview && card.preview.length > 0).map((card, idx) => (
```

**Benefit**: Cards with no preview text don't render at all

#### B. Improved Preview Parsing
```typescript
// Stop if line looks like a section header (all caps, very long)
if (line === line.toUpperCase() && line.length > 40) {
  inCardPreviewMode = false;
  continue;
}
```

**Benefit**: All-caps headers aren't treated as preview text

#### C. Better "Detailed Explanation" Detection
```typescript
// Must be its own line, short (< 40 chars)
if (line.length < 40 && 
    line.toLowerCase().includes('detailed') && 
    line.toLowerCase().includes('explanation')) {
  captureDetails = true;
}
```

**Benefit**: Only real "Detailed Explanation" headers trigger detail capture

#### D. Don't Show Empty Detailed Section
```typescript
{detailedExplanation && detailedExplanation.length > 50 && (
```

**Benefit**: Section only appears if there's substantial content (>50 chars)

#### E. Save Cards Only If Complete
```typescript
if (currentCard?.emoji && currentCard?.title && currentCard?.preview) {
  insightCards.push(currentCard as InsightCard);
}
```

**Benefit**: Incomplete cards are discarded

## Updated Parsing Flow

### Before (Buggy)
1. See emoji → Start card
2. See frequency → Add to card
3. See ANY text → Assume it's preview
4. See "detailed" anywhere → Capture as details
5. Show card even if empty

**Problems**:
- All-caps text treated as preview
- "Detailed" keyword too broad
- Cards shown even without content

### After (Fixed)
1. See emoji → Start card
2. See frequency → Enter preview mode
3. See normal text → Add to preview
4. See ALL-CAPS text → Stop preview mode (section header)
5. See "Detailed Explanation" on short line → Enter detail mode
6. Only save card if: emoji + title + preview exist
7. Only show card if: preview has content
8. Only show detailed section if: >50 chars

**Benefits**:
- Robust against malformed responses
- Filters out incomplete cards
- Distinguishes content from headers
- Graceful degradation

## Testing Scenarios

### Scenario 1: Card With No Preview
**AI Response**:
```
👥 Social Conflict
Very common
```

**Result**: Card not rendered (filtered out)

### Scenario 2: All-Caps Section Header
**AI Response**:
```
👥 Social Conflict
Very common
Robbie struggles during group activities.

ROBBIE'S INTERACTIONS WITH PEERS OFTEN LEAD TO CONFLICTS...
```

**Result**: 
- Preview: "Robbie struggles during group activities."
- All-caps text ignored (detected as section header)

### Scenario 3: No Detailed Explanation
**AI Response**:
```
High confidence based on 10 events.

👥 Social Conflict
Very common
Brief preview text.
```

**Result**: No "Detailed Explanation" section shown

### Scenario 4: Malformed "Detailed"
**AI Response**:
```
👥 Social Conflict
Very common  
We have detailed the pattern carefully.
```

**Result**: "detailed" in middle of sentence doesn't trigger detail mode

### Scenario 5: Complete Valid Response
**AI Response**:
```
High confidence based on 42 events and 3 documents.

👥 Social Conflict
Very common
Robbie struggles during unstructured group activities at school.

📅 Unexpected Changes
Moderately common
Transitions without warning trigger defensive responses.

Detailed Explanation
The data shows a clear hierarchy of triggers with social situations being most prominent...
```

**Result**: 
- Confidence badge ✅
- 2 cards with previews ✅
- Detailed section expandable ✅

## Code Changes Summary

### Files Modified
- `/mobile/app/(tabs)/conversation.tsx`

### Lines Changed
- Parsing logic (~30 lines improved)
- Card filtering (1 line added)
- Detailed section conditional (1 line added)
- Card completion check (1 line improved)

### No Breaking Changes
- Fallback to prose still works
- All functionality preserved
- Existing tests unchanged

## Verification Checklist

After update, verify:
- [ ] Cards without preview text don't appear
- [ ] All-caps text doesn't become preview
- [ ] "Detailed Explanation" only triggers on proper header
- [ ] Empty detailed section doesn't show
- [ ] Confidence numbers match actual event/doc counts
- [ ] Complete cards render properly
- [ ] Fallback to prose works for simple questions

## Expected Behavior Now

### Good Response
✅ 2-5 cards with emoji, title, frequency, preview  
✅ Each card has meaningful preview text  
✅ Detailed explanation only if substantial content  
✅ Confidence shows real data counts  

### Malformed Response
✅ Filters out cards with no preview  
✅ Ignores section headers as content  
✅ Falls back to prose if needed  
✅ Never shows broken/empty cards  

---

**Fixed**: June 24, 2026  
**Issues Resolved**: Empty cards, malformed parsing, all-caps text handling

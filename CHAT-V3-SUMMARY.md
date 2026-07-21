# Chat Tab V3 - Editorial Voice Redesign Summary

## What Changed

Round 3 is about **editorial voice**, not visual design. The goal: make Attune sound like a developmental specialist who knows this child, not an AI organizing its output.

## Core Philosophy Shifts

### 1. Cards ARE the Answer
**Before**: Cards were previews requiring expansion  
**After**: Cards contain complete insights; expansion shows examples

**Example**:
```
👥 Social Conflict During Unstructured Time
Strong Pattern
Robbie struggles most when expectations suddenly change during 
unstructured activities. This appears most strongly during recess 
and lunch periods, particularly on Mondays and after long weekends 
when routine re-establishment is hardest.
↓ See examples
```

Parent understands the pattern without expanding anything.

### 2. Write Like a Specialist
**Avoid**: "The data indicates...", "Based on the logs..."  
**Instead**: "One pattern stands out more than any other:", "Across Robbie's recent weeks..."

Sound thoughtful and curated, not algorithmic.

### 3. Natural Confidence
**Before**: "High confidence based on 42 events and 3 documents"  
**After**: "Several patterns emerge from Robbie's recent weeks"

Reinforces trust without feeling statistical.

### 4. Insight-Focused Labels
**Before**: Very Common, Occasional, Rare  
**After**: Strong Pattern, Frequently Observed, Worth Monitoring

Labels communicate understanding, not just frequency.

### 5. Supporting Details (Not "Detailed Explanation")
Expandable content contains:
- Specific logged events with dates
- Document excerpts  
- Examples from assessments
- Contextual reasoning

Not repetitive prose explaining what the card already said.

## Key Changes Made

### Prompt Engineering (Major Rewrite)

**New System Prompt**:
```
You are Attune, a developmental specialist writing observations 
about a specific child you've been studying closely.

CRITICAL WRITING PRINCIPLES:

1. CARDS ARE THE ANSWER, NOT PREVIEWS
2. WRITE LIKE A SPECIALIST, NOT AN LLM
3. SYNTHESIZE BEFORE EXPLAINING
4. Make cards complete thoughts, not teasers
5. Sound considered, not algorithmic
```

**Enhanced User Prompt**:
- Passes child's name explicitly
- Includes exact event/document counts
- Reminds AI to use exact numbers (fixes hallucination bug)
- Emphasizes "write as a specialist who knows this child"

### UI Text Updates

| Element | Before | After |
|---------|--------|-------|
| Expand hint | "↓ Tap for details" | "↓ See examples" |
| Section header | "Detailed Explanation" | "Supporting Details" |
| Frequency label | "VERY COMMON" (green pill) | "Strong Pattern" (plain text) |

### Visual Refinements

| Property | Before | After | Why |
|----------|--------|-------|-----|
| Preview text size | 15px | 16px | This IS the answer |
| Preview text color | Gray | Primary text | Not secondary |
| Frequency badge | Green pill, uppercase | Transparent, sentence case | Less data-focused |
| Frequency color | Sage green | Muted gray | Subtle, not prominent |

### Bug Fix

**Document Count Hallucination**:
- Problem: AI said "5 documents" when only 3 exist
- Solution: Explicitly pass counts in prompt: `${allEvents.length} events, ${selectedDocs.length} documents`
- Instruction: "Use the exact numbers provided above"

## Writing Guidelines

### DO:
```
"One pattern stands out more than any other:"
"Across Robbie's days, a consistent theme emerges."
"This appears most strongly during morning transitions."
"Robbie struggles most when expectations suddenly change."
```

### DON'T:
```
"Based on the data..."
"The logs indicate..."
"Analysis shows..."
"According to the events..."
```

## Success Criteria

A parent should be able to:
1. **Glance** (3 sec) → Understand main patterns via titles
2. **Read** (15 sec) → Have complete answers from card content
3. **Expand** (30 sec) → See supporting examples if curious
4. **Share** → Screenshot a card and it makes sense standalone

The experience should feel:
- ✅ Like a specialist's curated observations
- ✅ Thoughtfully considered over weeks
- ✅ Warm, personal, specific to this child
- ❌ NOT like formatted ChatGPT
- ❌ NOT like a database result
- ❌ NOT like prettier messaging UI

## Example Response

### Question: "What are Robbie's common triggers?"

```
Several patterns emerge from Robbie's recent weeks.

┌────────────────────────────────────────────────┐
│ 👥 Social Conflict During Unstructured Time    │
│ Strong Pattern                                 │
│                                                │
│ Robbie struggles most when expectations        │
│ suddenly change during unstructured activities.│
│ This appears most strongly during recess and   │
│ lunch periods, particularly on Mondays and     │
│ after long weekends when routine              │
│ re-establishment is hardest.                   │
│                                                │
│              ↓ See examples                     │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ 📅 Transition Anxiety                          │
│ Frequently Observed                            │
│                                                │
│ Unexpected changes trigger defensive responses.│
│ Morning transitions are especially challenging │
│ when substitute teachers appear or scheduled   │
│ activities are cancelled without advance       │
│ notice.                                        │
│                                                │
│              ↓ See examples                     │
└────────────────────────────────────────────────┘

▶ Supporting Details
```

**What Makes This V3**:
- Cards contain complete insights (3+ sentences)
- Natural opening ("Several patterns emerge...")
- No "data indicates" language
- Labels communicate insight ("Strong Pattern")
- Specific details (Mondays, recess, substitute teachers)
- "See examples" implies supplementary, not required

## Files Modified

- `/mobile/app/(tabs)/conversation.tsx`
  - System prompt rewritten (~60 lines)
  - User prompt enhanced
  - Label detection updated
  - UI text changed
  - Frequency badge simplified
  - Preview text promoted

## Testing Checklist

### Content
- [ ] Cards have 2-3+ sentences (complete thoughts)
- [ ] No "data indicates" / "logs show" language
- [ ] Confidence statement feels natural
- [ ] Child's name used throughout
- [ ] Labels use insight language
- [ ] Supporting details show examples, not repetition

### Accuracy
- [ ] Event count correct
- [ ] Document count correct
- [ ] References to specific events are real
- [ ] Document excerpts match uploads

### Voice
- [ ] Sounds like specialist who knows child
- [ ] Thoughtful and considered
- [ ] Insights before evidence
- [ ] Curated, not generated

### UX
- [ ] Understandable without expanding
- [ ] "See examples" feels optional
- [ ] Cards screenshot-worthy
- [ ] Unique to Attune (not generic AI)

## The Goal

If someone sees a screenshot of this screen without context, they should immediately think:

**"This is purpose-built software for parents of neurodivergent children."**

Not:
- ❌ "This is ChatGPT with nicer formatting"
- ❌ "This is a messaging app"
- ❌ "This is a generic AI assistant"

---

**Version**: 3.0 (Editorial Voice)  
**Date**: June 24, 2026  
**Focus**: Content design and specialist voice  
**Result**: Developmental specialist observations, not AI-generated cards

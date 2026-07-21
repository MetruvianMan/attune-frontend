# Chat Tab V3 - Editorial Voice & Content Design

## The Core Shift

Round 3 is not about visual design. It's about **making Attune sound like a developmental specialist who knows this child**, not an AI organizing its response.

### The Problem with V2
- Cards felt like previews requiring expansion
- Writing sounded like "well-formatted ChatGPT"
- Confidence was mechanical ("42 events and 3 documents")
- Labels were statistical ("Very common", "Occasional")
- Experience felt like organized AI output

### The Solution in V3
- **Cards ARE the answer** - parents shouldn't need to expand anything
- **Write like a specialist** - "One pattern stands out more than any other..."
- **Natural confidence** - "This pattern appears consistently across Robbie's logs"
- **Insight labels** - "Strong Pattern", "Frequently Observed", "Worth Monitoring"
- **Experience feels curated** - like someone studied this child for weeks

## Key Changes

### 1. Cards Contain Complete Insights

**Before (V2)**:
```
👥 Social Conflict [Very common]
Robbie struggles during unstructured activities...
↓ Tap for details
```
*Problem*: Feels like a teaser. Parents must expand to get the answer.

**After (V3)**:
```
👥 Social Conflict During Unstructured Time
Strong Pattern
Robbie struggles most when expectations suddenly change during 
unstructured activities. This appears most strongly during recess 
and lunch periods, particularly on Mondays and after long weekends 
when routine re-establishment is hardest.
↓ See examples
```
*Solution*: Card IS the answer. "See examples" implies supplementary content.

### 2. Developmental Specialist Voice

**Before (V2)**:
```
"Based on the data, Robbie shows difficulty with transitions.
The logs indicate this occurs frequently during schedule changes."
```
*Problem*: Sounds algorithmic. "The data indicates..."

**After (V3)**:
```
"One pattern stands out more than any other: Robbie struggles most 
when expectations suddenly change. Across his recent weeks, this 
emerges most clearly during morning transitions."
```
*Solution*: Sounds human. Thoughtful observations, not data analysis.

### 3. Natural Confidence Statements

**Before (V2)**:
```
📊 High confidence based on 42 logged events and 3 uploaded documents.
```
*Problem*: Mechanical. Emphasizes numbers over insight.

**After (V3)**:
```
Several patterns emerge from Robbie's recent weeks.
```
or
```
This pattern appears consistently across Robbie's daily logs and 
uploaded assessments.
```
or
```
This is one of the strongest patterns we've observed.
```
*Solution*: Reinforces trust without feeling statistical.

### 4. Insight-Focused Labels

**Before (V2)**:
- Very Common
- Common  
- Moderately Common
- Occasional
- Rare

*Problem*: Statistical frequency doesn't communicate value.

**After (V3)**:
- Strong Pattern
- Frequently Observed
- Worth Monitoring
- Emerging Pattern

*Solution*: Labels communicate understanding and importance.

### 5. Supporting Details (Not "Detailed Explanation")

**Before (V2)**:
```
▶ Detailed Explanation
The data shows a clear hierarchy of triggers with social 
situations being the most prominent challenge...
```
*Problem*: Sounds like a textbook. "The data shows..."

**After (V3)**:
```
▶ Supporting Details
[Specific logged events with dates]
[Document excerpts]
[Examples from assessments]
[Contextual reasoning]
```
*Solution*: Evidence and examples, not repetitive explanation.

## Prompt Engineering Changes

### System Prompt Transformation

#### Before (V2):
```
You are Attune, a compassionate caregiving assistant...

CRITICAL: Structure your responses in this exact format:
1. Confidence statement: "High confidence based on X events..."
2. Cards with [EMOJI] [Title] [Frequency] [Preview]
3. "Detailed Explanation" section
```

#### After (V3):
```
You are Attune, a developmental specialist writing observations 
about a specific child you've been studying closely.

CRITICAL WRITING PRINCIPLES:

1. CARDS ARE THE ANSWER, NOT PREVIEWS
   - Each card should contain the complete insight
   - Parents should understand without expanding

2. WRITE LIKE A SPECIALIST, NOT AN LLM
   - Avoid: "The data indicates..."
   - Instead: "One pattern stands out more than any other:"
   - Sound thoughtful and curated, not generated

3. SYNTHESIZE BEFORE EXPLAINING
   - Lead with insight, then provide context
   - Evidence comes after understanding

4. Use natural confidence statements
5. Make cards complete thoughts, not teasers
6. Sound considered, not algorithmic
```

### User Prompt Enhancement

**Added**:
- Explicit child name: `Name: ${profile.displayName}`
- Exact data counts: `${allEvents.length} events, ${selectedDocs.length} documents`
- Instruction to use exact numbers (fixes the "5 documents when 3 exist" bug)
- Reminder: "Write as a developmental specialist who has been studying [Name] closely"

## Visual Changes (Minimal)

### Frequency Badge
**Before**: Green pill with uppercase text
**After**: Plain text, sentence case, muted color
```css
backgroundColor: transparent (was colors.sageLight)
textTransform: none (was uppercase)
color: colors.textMuted (was colors.sage)
```

*Rationale*: Less "data badge", more natural label

### Preview Text (Now "Main Insight Text")
**Before**: 15px, gray, feels secondary
**After**: 16px, primary text color, feels primary
```css
fontSize: 16 (was 15)
color: colors.text (was colors.textDim)
lineHeight: 24 (was 22)
```

*Rationale*: This IS the answer, not a preview

### Expand Hint
**Before**: "↓ Tap for details"
**After**: "↓ See examples"

*Rationale*: Reinforces that card is complete; examples are supplementary

### Section Header
**Before**: "Detailed Explanation"
**After**: "Supporting Details"

*Rationale*: Sets expectation for evidence, not repetitive prose

## Example Response Comparison

### Question: "What are Robbie's common triggers?"

#### V2 Response (Organized AI)
```
High confidence based on 42 logged events and 3 uploaded documents.

👥 Social Conflict [Very common]
Robbie struggles during unstructured activities...
↓ Tap for details

[Expanded: More details about the pattern...]

▶ Detailed Explanation
The data shows a clear hierarchy of triggers with social situations 
being the most prominent challenge. Based on analysis of the logged 
events, we can see that...
```

#### V3 Response (Developmental Specialist)
```
Several patterns emerge from Robbie's recent weeks.

👥 Social Conflict During Unstructured Time
Strong Pattern
Robbie struggles most when expectations suddenly change during 
unstructured activities. This appears most strongly during recess 
and lunch periods, particularly on Mondays and after long weekends 
when routine re-establishment is hardest.
↓ See examples

[Expanded: October 23 - refused to join group game after unexpected 
field trip cancellation. Teacher notes indicate he sought isolated 
corner of playground...]

▶ Supporting Details
The pattern is particularly evident in Mrs. Thompson's October 
assessment, which notes: "Robbie thrives with clear structure but 
becomes dysregulated when peer interactions lack defined roles."

The strongest incidents occurred during:
- Monday morning transitions (5 instances)
- Post-weekend reintegration (3 instances)
- Substitute teacher days (4 instances)
```

### What Changed
- ✅ Card contains complete answer (2-3 full sentences)
- ✅ No "based on data" language
- ✅ Specific contextual details (recess, Mondays, routine)
- ✅ Natural phrasing ("Several patterns emerge...")
- ✅ Expanded content shows examples, not repetition
- ✅ Supporting details cite specific assessments and dates

## Writing Guidelines

### DO Write Like This
```
"One pattern stands out more than any other:"
"Across Robbie's days, a consistent theme emerges."
"This appears most strongly during morning transitions."
"Several patterns emerge from Robbie's recent weeks."
"Robbie struggles most when expectations suddenly change."
```

### DON'T Write Like This
```
"Based on the data..."
"The logs indicate..."
"Analysis shows..."
"According to the events..."
"The information suggests..."
```

### DO Structure Cards Like This
```
Complete observation (what happens)
+ Contextual specificity (when/where)  
+ Pattern reinforcement (frequency/conditions)
= Actionable insight
```

### DON'T Structure Cards Like This
```
Brief teaser
+ "Tap to see more"
+ Core insight hidden in expansion
= Parent must work to understand
```

## Success Criteria

### A Parent Should Be Able To:
1. **Glance** at card titles (3 seconds) → Understand the main patterns
2. **Read** card content (15 seconds) → Have complete answers
3. **Expand** examples (30 seconds) → See supporting evidence if curious
4. **Share** a card screenshot with teachers → It makes sense standalone

### The Experience Should Feel:
- ✅ Like reading a specialist's notes after they observed your child
- ✅ Thoughtfully curated over weeks of observation
- ✅ Warm, personal, specific to this child
- ✅ Professionally considered, not algorithmically generated
- ❌ NOT like ChatGPT formatted into cards
- ❌ NOT like a database query result
- ❌ NOT like messaging app with prettier UI

## Technical Implementation

### Files Changed
- `/mobile/app/(tabs)/conversation.tsx`
  - System prompt rewritten (~60 lines)
  - User prompt enhanced with explicit counts
  - Parsing updated for new labels
  - UI text changes ("See examples", "Supporting Details")
  - Frequency badge styling simplified
  - Preview text promoted to primary styling

### New Label Detection
```typescript
// Now detects:
'pattern', 'observed', 'monitoring', 'emerging',
'strong', 'frequent', 'common', 'occasional'

// In addition to old:
'very common', 'moderate', 'rare'
```

### Document Count Fix
```typescript
// Explicitly passes counts to prevent hallucination
DATA AVAILABLE:
- ${allEvents.length} logged events
- ${selectedDocs.length} uploaded documents

// And reminds in instruction:
"Use the exact numbers provided above (X events, Y documents)"
```

## Testing Checklist

### Content Quality
- [ ] Cards contain complete insights (2-3 sentences minimum)
- [ ] No "data indicates" or "based on logs" language
- [ ] Confidence statement feels natural, not statistical
- [ ] Child's actual name appears in response
- [ ] Labels use "Strong Pattern" / "Frequently Observed" style
- [ ] "Supporting Details" contains examples, not repetition

### Accuracy
- [ ] Event count matches actual logged events
- [ ] Document count matches actual uploaded documents
- [ ] Specific dates/events referenced are real
- [ ] Document excerpts match actual uploads

### Voice
- [ ] Sounds like a specialist who knows this child
- [ ] Writing is thoughtful and considered
- [ ] Insights come before evidence
- [ ] Feels curated, not generated

### UX
- [ ] Parents can understand response without expanding
- [ ] "See examples" hint feels supplementary, not required
- [ ] Cards feel valuable enough to screenshot
- [ ] Overall experience feels unique to Attune

## Future Enhancements

### Phase 4 (Consideration)
- **Longitudinal observations**: "This pattern has strengthened over the past 3 weeks"
- **Comparative context**: "This differs from how Robbie responds at home"
- **Actionable next steps**: Inline suggestions within cards
- **Confidence evolution**: "We're seeing this more clearly now than we did last month"
- **Document integration**: Inline citations within card text

---

**Version**: 3.0 (Editorial Voice)  
**Date**: June 24, 2026  
**Philosophy**: Developmental specialist's observations, not AI-generated cards  
**Goal**: Make screenshots of this screen immediately recognizable as purpose-built parenting software

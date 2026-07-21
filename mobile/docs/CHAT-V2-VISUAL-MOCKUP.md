# Chat Tab V2 - Visual Mockup

## Full Screen Layout

```
┌─────────────────────────────────────────┐
│  💬 Chat                    [Robbie] 📷  │ ← Header
├─────────────────────────────────────────┤
│                                         │
│  What are Robbie's common triggers?    │| ← User question
│                              9:23 PM    │|   (sage border)
│                                         │
│                                         │
│  ATTUNE                                 │ ← Label
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📊 High confidence based on 42    │ │ ← Confidence badge
│  │ logged events and 3 documents.    │ │   (blue accent)
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 👥  Social Conflict  [Very common]│ │ ← Card 1
│  │                                   │ │
│  │ Robbie struggles most during      │ │
│  │ unstructured group activities at  │ │
│  │ school, particularly during...    │ │
│  │                                   │ │
│  │        ↓ Tap for details          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 📅  Unexpected Changes [Moderate] │ │ ← Card 2
│  │                                   │ │
│  │ Transitions without advance       │ │
│  │ warning trigger defensive...      │ │
│  │                                   │ │
│  │        ↓ Tap for details          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔊  Sensory Overload [Occasional] │ │ ← Card 3
│  │                                   │ │
│  │ Loud environments (assemblies,    │ │
│  │ cafeteria) correlate with...      │ │
│  │                                   │ │
│  │        ↓ Tap for details          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ▶ Detailed Explanation            │ │ ← Expandable
│  └───────────────────────────────────┘ │   section
│                                         │
├─────────────────────────────────────────┤
│ + New  📄 3 docs · 📊 Data  💾 Save 📚 │ ← Context bar
├─────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌──┐ │
│ │ Ask about patterns,         │  │→ │ │ ← Input
│ │ strengths, supports...      │  └──┘ │
│ └─────────────────────────────┘       │
└─────────────────────────────────────────┘
```

## Card States

### Collapsed Card (Default)
```
┌─────────────────────────────────────────┐
│ 👥  Social Conflict           [Very common] │
│                                           │
│ Robbie struggles most during unstructured │
│ group activities at school...             │
│                                           │
│            ↓ Tap for details              │
└─────────────────────────────────────────┘
```

### Expanded Card (After Tap)
```
┌─────────────────────────────────────────┐
│ 👥  Social Conflict           [Very common] │
│                                           │
│ Robbie struggles most during unstructured │
│ group activities at school, particularly  │
│ during recess and lunch. Pattern strongest│
│ on Mondays and after long weekends.       │
│ ─────────────────────────────────────────│
│ This pattern has been observed 23 times   │
│ over the past 6 weeks, with 18 incidents │
│ occurring during morning recess. Teacher  │
│ notes indicate he seeks isolated spaces.  │
│                                           │
│            ↑ Tap to collapse              │
└─────────────────────────────────────────┘
```

## Detailed Explanation States

### Collapsed (Default)
```
┌─────────────────────────────────────────┐
│ ▶ Detailed Explanation                  │
└─────────────────────────────────────────┘
```

### Expanded (After Tap)
```
┌─────────────────────────────────────────┐
│ ▼ Detailed Explanation                  │
├─────────────────────────────────────────┤
│                                         │
│ The data shows a clear hierarchy of     │
│ triggers, with social situations being  │
│ the most prominent challenge. This      │
│ aligns with typical developmental       │
│ patterns for autistic children who      │
│ may find unpredictable social dynamics  │
│ overwhelming.                           │
│                                         │
│ The frequency of Monday incidents       │
│ suggests weekend transitions compound   │
│ the challenge...                        │
│                                         │
└─────────────────────────────────────────┘
```

## Frequency Badge Variations

```
[Very common]  ← Sage green background, dark green text
[Common]       ← Lighter sage, same text style
[Moderate]     ← Even lighter sage
[Occasional]   ← Very light sage
[Rare]         ← Barely tinted sage
```

## Confidence Badge Variations

```
┌─────────────────────────────────────────┐
│ 📊 High confidence based on 42 events   │ ← Blue accent
│ and 3 uploaded documents.               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 Medium confidence based on 12 events │ ← Yellow/warm
│ and 1 document. More data recommended.  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📊 Low confidence based on 3 events.    │ ← Neutral gray
│ Log more data for better insights.      │
└─────────────────────────────────────────┘
```

## Typography Hierarchy

```
ATTUNE                          ← 11px, uppercase, bold, blue
                                   letter-spacing 1.2

📊 High confidence based on...  ← 13px, weight 600, blue
                                   (in confidence badge)

👥  Social Conflict             ← 24px emoji + 17px bold title
                                   letter-spacing -0.3

[Very common]                   ← 11px uppercase, bold
                                   letter-spacing 0.5, sage

Robbie struggles most during... ← 15px, line-height 22px
                                   (preview text)

This pattern has been observed... ← 14px, line-height 21px
                                     (expanded details)

▶ Detailed Explanation          ← 14px bold
                                   letter-spacing -0.2

The data shows a clear...       ← 15px, line-height 23px
                                   (detailed paragraphs)

↓ Tap for details               ← 11px, muted, centered
```

## Color Palette

```
Confidence Badge:
  Background: colors.accentLight (rgba(74,144,226,0.08))
  Border: colors.accent (#4A90E2)
  Text: colors.accent (#4A90E2)

Insight Cards:
  Background: colors.card (#FFFFFF)
  Border: colors.borderSubtle (rgba(74,144,226,0.06))
  Shadow: shadows.card (0px 4px 14px rgba(0,0,0,0.06))
  
Card Title:
  Text: colors.text (#2D3436)
  
Frequency Badge:
  Background: colors.sageLight (rgba(127,191,159,0.10))
  Text: colors.sage (#7FBF9F)

Preview Text:
  Color: colors.textDim (#636E72)

Expanded Details Border:
  Color: colors.borderSubtle (rgba(74,144,226,0.06))

Detailed Section Header:
  Background: colors.bgDeep (#EDF5F3)
  Text: colors.text (#2D3436)

Tap Hints:
  Color: colors.textMuted (#B2BEC3)
```

## Spacing & Sizing

```
Card Dimensions:
  Padding: 16px all sides
  Border radius: 14px
  Margin bottom: 12px between cards
  
Card Header:
  Emoji size: 24px
  Title-emoji gap: 10px
  Frequency badge: 10px horizontal, 4px vertical padding
  
Confidence Badge:
  Padding: 14px horizontal, 10px vertical
  Border radius: 12px
  Left border: 3px
  Margin bottom: 8px
  
Preview Text:
  Margin bottom: 8px
  
Expanded Details:
  Margin top: 8px
  Padding top: 12px
  
Tap Hint:
  Margin top: 4px
  
Detailed Section:
  Header padding: 12px vertical, 14px horizontal
  Border radius: 12px
  Content margin top: 12px
  Content padding: 14px horizontal
```

## Touch Target Sizes

```
Entire Insight Card:
  ≥ 120px height (typically ~140-160px)
  Full width minus 16px margins
  Entire card is tappable ✓

Detailed Section Header:
  ≥ 44px height
  Full width
  Entire header is tappable ✓

Send Button:
  48×48px (exceeds 44px minimum) ✓

Context Actions:
  ≥ 40px touch area ✓
```

## Animation Notes

```
Card Expansion:
  - Smooth height transition
  - Hint text changes instantly
  - No jarring jumps
  - Content fades in slightly

Detailed Section:
  - Triangle rotates ▶ → ▼
  - Content slides down
  - Smooth 200-300ms transition

Tap Feedback:
  - activeOpacity={0.7}
  - Entire card dims slightly
  - Native iOS feel
```

## Accessibility

```
VoiceOver Labels:
  - "Social Conflict, very common trigger"
  - "Tap to expand for more details"
  - "Expanded. Tap to collapse"
  - "Detailed explanation, collapsed. Tap to expand"

Dynamic Type:
  - All text scales with iOS font size settings
  - Layout adapts to larger text
  - Touch targets remain ≥44px

Color Contrast:
  - All text meets WCAG AA
  - Frequency badges have sufficient contrast
  - Tap hints are visible but secondary
```

## Real Example Flow

### Parent Question
```
"What triggers Robbie's meltdowns?"
```

### AI Response (Structured)
```
High confidence based on 37 logged events and 2 uploaded documents.

👥 Social Conflict
Very common
Observed in 18 of 37 events. Particularly during unstructured peer interactions at school. Teacher notes mention difficulty with turn-taking and shared spaces.

📅 Schedule Changes
Moderately common
9 incidents linked to unexpected transitions. Most pronounced when substitute teachers appear or regular activities are cancelled without warning.

🔊 Sensory Overload
Occasional
5 events during loud assemblies or fire drills. Recovery time typically 20-30 minutes in quiet space. Noise-cancelling headphones helped twice.

⏰ Fatigue
Occasional
5 late-day incidents (after 3pm). Pattern suggests cumulative stress throughout day. Earlier bedtime on Mondays may help.

Detailed Explanation
The data reveals a clear pattern where social unpredictability is the primary trigger, accounting for nearly half of all logged meltdowns. This aligns with research on autistic children who often find unstructured social situations cognitively demanding...
```

### Parent Experience
1. **Glance** (2 sec): "Oh, 4 main triggers. Social is #1."
2. **Scan** (10 sec): Reads all preview texts
3. **Expand** (30 sec): Taps "Social Conflict" to see details
4. **Deep dive** (2 min): Opens detailed explanation
5. **Action**: Books meeting with teacher about recess structure

### Without Structure-First Design
1. **Read** (60+ sec): Plows through paragraphs
2. **Extract**: Mentally notes key points
3. **Confused**: Which trigger is most important?
4. **Frustrated**: Too much text, need to re-read
5. **Abandon**: Too exhausted to process

## Comparison: Old vs. New Layout

### Old (Prose)
```
┌─────────────────────────────────────┐
│ Based on your logged data, I've    │
│ identified several patterns in      │
│ Robbie's triggers. Social situations│
│ appear to be the most challenging,  │
│ particularly during unstructured    │
│ group activities at school. This    │
│ includes recess and lunch periods   │
│ where there is less adult super-    │
│ vision and more unpredictability... │
│                                     │
│ [10 more paragraphs continue...]    │
└─────────────────────────────────────┘
```
❌ 500+ words to scan
❌ Insights buried in prose
❌ No clear hierarchy
❌ Mentally exhausting

### New (Structured)
```
┌─────────────────────────────────────┐
│ 📊 High confidence: 37 events       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 👥 Social [Very common]             │
│ Unstructured interactions...        │
│ ↓ Tap for details                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 Changes [Moderate]               │
│ Unexpected transitions...           │
│ ↓ Tap for details                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔊 Sensory [Occasional]             │
│ Loud environments...                │
│ ↓ Tap for details                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ▶ Detailed Explanation              │
└─────────────────────────────────────┘
```
✅ Scan in 3 seconds
✅ Insights immediately visible
✅ Clear hierarchy
✅ Actionable from first glance

---

**Purpose**: This mockup shows what parents will actually see when using the redesigned Chat tab. The structure-first approach transforms AI responses from homework into insights.

**Date**: June 24, 2026

# Next Steps: Playback Fix → Empty State Phase 2

## Current Status

✅ **Design System Applied** - Dark neumorphic theme across all pages
✅ **Tactical Fixes Applied** - Purple outlines, orange optimize button, etc.
❌ **Playback Broken** - Leaves tab frame, white background, disrupts flow
⏸️ **Empty State Phase 2** - On hold until Playback fixed

---

## Phase 1: Fix Playback Tab (PRIORITY)

### Problem
- Playback breaks out of tab container
- Shows white background instead of dark mode
- Loses navigation/sidebar
- Disrupts UX flow

### Solution
Keep Playback inside the same tab frame as Overview, Bottlenecks, etc.

### Claude Code Prompt
**File:** `.claude-code-prompts/fix-playback-tab.md`

**What it does:**
1. Integrates Playback as tab component (not separate route)
2. Applies dark neumorphic styling to ReactFlow canvas
3. Keeps navigation/sidebar visible
4. Maintains consistent UX with other tabs
5. Colors nodes by bottleneck severity

### Reference Images
- Current (broken): `~/dev/_shared/quick-share/signalflow/edits/current-playback.png`
- Proposed (fixed): `~/dev/_shared/quick-share/signalflow/edits/proposeed-playback.png`

### Expected Outcome
- Playback renders inside main execution page
- Dark background (#1e2028) throughout
- Controls use neumorphic styling
- Seamless tab switching (Overview ↔ Playback ↔ Critical Path)
- No more jarring UX breaks

---

## Phase 2: Empty State Onboarding (AFTER PLAYBACK)

### Goal
Replace basic empty state with beautiful onboarding flow from mockups

### Approach (To Be Refined)
1. **Review mockups together** - Define exact scope
2. **Start simple** - Improve current empty state styling first
3. **Add step cards** - If simple version looks good
4. **Iterate** - Build incrementally with checkpoints

### Key Questions for Tomorrow
- Simple improvement or full step-by-step flow?
- Which mockup elements are must-haves?
- What can we simplify/skip?

---

## Execution Plan

### Today/Tonight: Fix Playback

```bash
# In Claude Code
Use prompt: .claude-code-prompts/fix-playback-tab.md
```

**Test:**
1. Navigate to any execution: `http://localhost:3001/execution/{id}`
2. Click "Playback" tab
3. Verify:
   - Stays in same frame (navigation visible)
   - Dark background throughout
   - Nodes visible in canvas
   - Controls work (play/pause/speed)
   - Smooth tab switching

### Tomorrow: Empty State Phase 2

**After Playback is working:**
1. Review mockups together
2. Define clear scope
3. Create simplified prompt
4. Build incrementally
5. Review after each step

---

## Why This Order Matters

**Fix Playback First Because:**
- It's currently broken (impacts usability)
- Simpler scope (one tab, clear goal)
- Lower risk (won't touch empty state)
- Quick win builds confidence

**Empty State Second Because:**
- Requires clear vision (need alignment first)
- More subjective (design preferences)
- Can iterate based on Playback learnings
- Not blocking current functionality

---

## Success Metrics

### Playback Fixed
✅ No UX disruption
✅ Dark mode consistent
✅ Professional appearance
✅ Portfolio-ready

### Empty State (Future)
✅ Welcoming onboarding
✅ Clear next steps for users
✅ Matches design vision
✅ Portfolio-quality

---

## Next Session Prep

### For Scott
- Test Playback fix thoroughly
- Note any issues/adjustments needed
- Review empty state mockups
- Think about: simple vs. full onboarding?

### For Claude
- Wait for Playback feedback
- Prepare for empty state discussion
- Ready to iterate based on results

---

**Let's nail Playback first, then tackle empty state fresh! 🎯**


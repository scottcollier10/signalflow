# CLAUDE CODE PROMPT: Fix Dashboard Duration Bug

## Context
The SignalFlow Dashboard is showing incorrect execution durations. For execution #4639, the Dashboard displays 167ms while the Overview tab correctly shows 13.1s. These should match.

## Bug Details
- **Location:** Dashboard execution cards (http://localhost:3001/dashboard)
- **Symptom:** Duration shows 167ms instead of 13.1s
- **Impact:** Breaks portfolio demo narrative (13.1s → 1.6s optimization story)
- **Root Cause:** Likely displaying `critical_path_duration` instead of `duration`

## Task
Find and fix the Dashboard component to display the correct total execution duration.

## Investigation Steps

1. **Find the Dashboard execution card component**
   - Start in `frontend/app/dashboard/page.tsx`
   - Look for where duration is rendered in execution cards
   - Check for any child components that render execution data

2. **Identify the field being displayed**
   - Look for something like: `{execution.duration}` or `{execution.critical_path_duration}`
   - Check if there's any formatting/conversion happening

3. **Compare with Overview tab**
   - Check `frontend/app/execution/[id]/page.tsx` to see what field Overview uses
   - Overview shows correct value, so copy that pattern

4. **Fix the field reference**
   - Change from `critical_path_duration` to `duration` (or whatever Overview uses)
   - Ensure formatting is consistent (e.g., `.toFixed(1)` for one decimal)

## Expected Fix

**WRONG (current):**
```typescript
<span>{execution.critical_path_duration}s</span>
// Shows: 167ms
```

**RIGHT (should be):**
```typescript
<span>{execution.duration}s</span>
// Shows: 13.1s
```

## Testing

After fixing, verify:
- Dashboard shows 13.1s for execution #4639
- Overview shows 13.1s for execution #4639
- Both match!

Test URL: http://localhost:3001/dashboard (after `sf` to start services)

## Success Criteria
- [ ] Dashboard duration matches Overview duration
- [ ] No more 167ms anomaly
- [ ] Code uses correct field: `execution.duration`

## Reference
See full investigation guide: `/Users/scottcollier/dev/signalflow/docs/bug-fix-dashboard-duration.md`


# Execute: Empty State Steps + Import Instructions

## What This Implements

### Part 1: Step Progress Boxes ⭐ MAIN FEATURE
- 4 boxes at top of empty Dashboard
- Shows progress: Import → View → Optimize → Test
- Updates as user completes each step
- Disappears once any execution exists

### Part 2: Import Instructions Fix 🔧
- Upload File: Simple upload instructions
- Paste JSON: API + clipboard commands
- Fetch n8n: Keep current (already correct)

### Part 3: Import Overlay 🚫 SKIPPED
- Marked as optional/low priority
- Can add later if wanted

---

## Execute in Claude Code

```bash
# Use the comprehensive prompt
Prompt: .claude-code-prompts/empty-state-steps-and-import-fix.md
```

---

## What to Expect

### Dashboard (Empty State)
**Before:**
```
┌────────────────────────┐
│  Import Container      │
│  (3 methods)           │
└────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────┐
│ [1 Import] [2 View] [3 Optimize] [4 Test]│ ← NEW
│  (active)   (locked)  (locked)   (locked)│
├─────────────────────────────────────────┤
│  Import Container                       │
│  (3 methods)                            │
└─────────────────────────────────────────┘
```

### Import Page
**Before:**
- All methods show same (fetch) instructions ❌

**After:**
- Upload File → Upload-specific instructions ✓
- Paste JSON → API + clipboard commands ✓
- Fetch n8n → Current instructions (unchanged) ✓

---

## Testing Checklist

### Step Boxes
1. **Delete all executions** to see empty state
2. **Verify 4 boxes appear** at top
3. **Check Step 1 is active** (purple, highlighted)
4. **Check Steps 2-4 locked** (gray, muted)
5. **Import an execution** via any method
6. **Verify boxes disappear** (Dashboard now has data)

### Import Instructions
1. **Go to Import page**
2. **Click "Upload File"**
   - Should see simple upload instructions
   - No API key stuff
3. **Click "Paste JSON"**
   - Should see API key instructions
   - Should see curl/PowerShell commands
4. **Click "Fetch from n8n"**
   - Should see current instructions (unchanged)

### Mobile/Responsive
- Step boxes stack vertically on small screens
- Instructions remain readable
- No horizontal scroll

---

## If Something Looks Wrong

### Step Boxes Not Showing
- Make sure Dashboard is empty (`executions.length === 0`)
- Check localStorage for saved step state
- Try hard refresh (Cmd+Shift+R)

### Instructions Not Changing
- Make sure method selection actually changes state
- Check conditional rendering logic
- Verify `importMethod` state variable exists

### Styling Issues
- Verify neumorphic classes exist in globals.css
- Check Tailwind config has color tokens
- Look for console errors

---

## Next Steps After This Works

1. ✅ **Take screenshots** - Empty state with steps
2. ✅ **Test full flow** - Import → View → (note step updates)
3. ✅ **Git commit** - Lock in progress
4. ⏭️ **Consider overlay** - If wanted, tackle separately
5. 🎉 **Portfolio polish** - This is getting good!

---

## Questions to Consider

**Step Tracking:**
- Should steps auto-advance or manual trigger?
- Should we persist across sessions? (localStorage)
- What resets the steps? (e.g., delete all executions)

**For now:** Simple auto-advance when conditions met
- Import execution → Step 2
- View analysis → Step 3  
- Click optimize → Step 4

Can refine later based on usage!


# Bug Spec: [Bug Title]

> **Severity**: P0 (data loss / outage) | P1 (major broken) | P2 (workaround exists) | P3 (cosmetic)
> **Reporter**: [Name or "internal"]
> **Last updated**: YYYY-MM-DD
> **Related domain docs**: [link to relevant DOMAIN_*.md files]

---

## 1. Symptom

What the user sees / experiences. Be specific. No interpretation yet — just what was observed.

---

## 2. Reproduction Steps

1. [Setup — who is logged in, what role, what region]
2. [Action 1]
3. [Action 2]
4. **Expected**: [what should happen]
5. **Actual**: [what actually happens]

---

## 3. Scope of Impact

- **Who's affected**: [Specific roles, regions, candidate types]
- **How often**: Every time (deterministic) | Intermittent | Specific conditions
- **Workaround**: None / [describe]
- **Severity reasoning**: [why this severity]

---

## 4. Suspected Root Cause

Your best hypothesis. Even if wrong, gives Claude/teammates a starting point.

---

## 5. Investigation Notes

What you've already checked. Don't make Claude redo this.

- Checked: [thing]
- Found: [observation]
- Ruled out: [hypothesis and why]

---

## 6. Proposed Fix

The change you want to make. If unsure, list options with tradeoffs.

**Option A**: [description]
- Pros:
- Cons:

**Option B**: [description]
- Pros:
- Cons:

**Recommendation**: [which and why]

---

## 7. Test Plan

How you'll verify the fix.

- [ ] Unit test for [specific case]
- [ ] Manual repro: [steps]
- [ ] Regression: [what existing behavior to verify still works]

---

## 8. Lesson Captured

After fixing, what should be added to which `DOMAIN_*.md` "Common gotchas" section so this doesn't bite anyone again?

> [Write the gotcha here, then copy it to the relevant domain doc]

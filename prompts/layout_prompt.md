The dashboard currently allows widgets to overflow and require scrolling.
The requirement is: all initial widgets must be fully visible on a 1920×1080
screen without scrolling, given a sidebar layout.

Constraints:
- Screen: 1920×1080
- Layout: sidebar (~280px wide) + top nav (~60px tall)
- Usable canvas: approximately 1600px wide × 950px tall
- Widget count: 9–12 widgets
- Implementation: Flexbox, single component file

Task:
1. Audit the current flex container and children — check flex-direction,
   flex-wrap, flex-grow/shrink/basis values, and any explicit height or
   min-height on the container and widget children.
2. Identify what is causing overflow — likely an unconstrained container
   height, flex children with min-height that exceeds available space, or
   flex-wrap not distributing rows correctly.
3. Refactor the layout so that:
   - The outer dashboard container is height-constrained using
     height: calc(100vh - 60px) (subtract nav height) with overflow: hidden.
   - flex-wrap: wrap is set so widgets flow into multiple rows.
   - Each widget uses flex-basis to target ~33% width (3-column layout)
     or ~25% (4-column), minus gap, so rows fill the width cleanly.
   - Row height is controlled by giving widgets an explicit or calc()-based
     height so that 3–4 rows fit within the ~950px vertical budget including
     gaps. Avoid min-height values that push rows beyond their budget.
   - gap or margin values are accounted for in the height and width calc().
4. Differentiate widget heights if types vary — KPI/stat cards can be
   shorter (~130px), chart widgets taller (~240px). Use flex-basis height
   targeting per widget type if needed rather than forcing uniform height.
5. Do not change widget content, data, or any logic outside the layout.
6. After the change, verify that the sum of all row heights plus gaps does
   not exceed 950px, and that no widget is clipped or hidden.
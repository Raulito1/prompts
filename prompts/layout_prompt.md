The dashboard currently allows widgets to overflow and require scrolling.
The requirement is: all initial widgets must be fully visible above the fold
on any desktop screen (from 1280px wide up to 1920px+) without scrolling.

Constraints:
- Layout: sidebar (~280px wide) + top nav (~60px tall)
- Widget count: 9–12 widgets
- Implementation: Flexbox, single component file
- Must work at 1280×800, 1440×900, and 1920×1080 minimum

Task:
1. Audit the current flex container and children — check flex-direction,
   flex-wrap, flex-grow/shrink/basis values, and any explicit height or
   min-height on the container and widget children.
2. Identify what is causing overflow.
3. Refactor the layout so that:
   - The outer dashboard container uses height: calc(100vh - 60px)
     with overflow: hidden so it always fills the available viewport
     regardless of screen size.
   - flex-wrap: wrap is set on the container.
   - Widget width uses flex-basis as a percentage (e.g. ~33% for 3 columns)
     minus gap, so columns scale with the viewport width automatically.
   - Widget height uses flex-basis as a vh-based value so rows scale with
     the viewport height — do NOT use fixed px heights on widgets.
     Example: a 3-row layout where each row targets roughly 30vh minus gap.
   - gap uses rem rather than fixed px so spacing scales proportionally.
4. Differentiate row heights proportionally if widget types vary — KPI cards
   can target ~15vh, chart widgets ~28vh. Use flex-basis for height per
   widget type.
5. Do not change widget content, data, or any logic outside the layout.
6. After the change, verify the layout at three breakpoints by checking that
   the sum of widget heights plus gaps does not exceed calc(100vh - 60px)
   at 1280×800, 1440×900, and 1920×1080.
# Implementation Plan

- [x] 1. Update chart imports and component structure

  - Modify the import statement in `/app/dashboard/groupers/page.tsx` to include `BarChart` and `Bar` from Recharts
  - Remove `LineChart` and `Line` imports as they will no longer be needed
  - _Requirements: 1.1_
    0

- [x] 2. Replace LineChart with BarChart component

  - Locate the `LineChart` component in the weekly cumulative chart section (around line 3780)
  - Replace `<LineChart>` with `<BarChart>` maintaining all existing props
  - Update chart configuration to include `barCategoryGap={20}` and `barGap={4}` for proper spacing
  - _Requirements: 1.1, 1.3_

- [x] 3. Convert Line components to Bar components

  - Replace the `Line` components mapping over `uniqueGroupers` with `Bar` components
  - Update props: change `stroke` to `fill`, remove `strokeWidth`, `dot`, and `activeDot` props
  - Add `radius={[2, 2, 0, 0]}` for rounded top corners on bars
  - Maintain the existing color assignment logic using `chartColors[index % chartColors.length]`
  - _Requirements: 1.1, 1.3, 3.6_

- [x] 4. Optimize chart layout for variable week counts

  - Ensure the ResponsiveContainer maintains the existing 500px height
  - Verify that the bottom margin (80px) provides adequate space for rotated week labels
  - _Requirements: 2.1, 2.3_

# feat/possible-change-mark - Add "Needs Adjustment" Checkbox to Simulation Budget Form

## Description

Add a checkbox to each category row in the simulation budget detail table to visually mark entries that need future value adjustments. When checked, the row background changes to dark-yellow. The state is persisted in the database.

## TODO

- [ ] Create database migration (`/api/migrate-needs-adjustment`) to add `needs_adjustment BOOLEAN DEFAULT FALSE` column to `simulation_budgets`
- [ ] Update validation schema in `/lib/simulation-validation.ts` to include `needs_adjustment` field
- [ ] Update API route `/api/simulations/[id]/budgets/route.ts` to include `needs_adjustment` in UPSERT query and GET response
- [ ] Update `BudgetFormData` type and state management in `/components/simulation-budget-form.tsx`
- [ ] Add checkbox UI to category rows (after visibility toggle column)
- [ ] Add dark-yellow row highlight styling when checkbox is checked (`bg-yellow-700/40`)
- [ ] Add table header cell for the new column

## Files

| File                                        | Change                           |
| ------------------------------------------- | -------------------------------- |
| `app/api/migrate-needs-adjustment/route.ts` | New - Migration endpoint         |
| `lib/simulation-validation.ts`              | Add `needs_adjustment` to schema |
| `app/api/simulations/[id]/budgets/route.ts` | Add column to UPSERT             |
| `components/simulation-budget-form.tsx`     | Checkbox, highlight, state       |

## Verification

1. Run `GET /api/migrate-needs-adjustment`
2. Open simulation form, verify checkbox on rows
3. Check checkbox -> row turns dark-yellow
4. Save and reload -> state persists
5. Uncheck -> row normal, save persists

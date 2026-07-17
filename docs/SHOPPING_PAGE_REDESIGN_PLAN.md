# Shopping page redesign plan

Status: approved, not yet implemented

## Goal

Redesign the shopping page as a calm, mobile-first workspace with two clear
stages: **List** and **Compare**. The list remains the default view, catalogue
search becomes one unified add flow, and secondary tools move into compact
menus.

The redesign must preserve the existing shopping-list, catalogue matching,
template, and supermarket comparison behavior. It must not change pricing,
freshness, authentication, or household-authorization rules.

## Approved product decisions

- Primary flow: list first.
- Comparison presentation: `List` and `Compare` tabs on the same page.
- Item entry: unified smart add with a clear manual fallback.
- Item rows: show match state and the best fresh public price.
- Templates and list-management actions: compact toolbar menus.
- Visual direction: calm and practical, using the existing warm HouseFlow
  palette with minimal decoration.
- Primary usage: phone while shopping; desktop for planning.

## Implementation changes

### Page structure

- Replace the card-heavy header with a compact toolbar containing the selected
  list, active/done progress, `List` actions, `Templates`, and the
  `List / Compare` tabs.
- Consolidate list fetching so the page and list picker do not independently
  request the same data.
- Use dialogs for create, rename, archive, and delete. Archived lists should be
  visibly read-only until restored.
- Replace the two large statistics cards with one compact progress summary.
- Keep filtering the current list as a secondary control.
- Put completed items in a collapsed section below active items.

### Unified smart composer

- Replace the current suggestions dropdown, search modal, and product-details
  modal with one composer.
- Debounce `/api/prices/search` requests and ignore stale responses.
- Render catalogue results directly below the input. Each compact result shows
  the product, pack size, best fresh price, supermarket count, and an immediate
  Add action.
- Always provide an explicit “add as written” manual fallback.
- Keep quantity count and pack notes compact and optional.
- Support keyboard navigation with Up/Down, Enter, Escape, and correct focus
  restoration.
- Reuse the same composer for matching and rematching. Match mode should name
  the shopping item being matched, seed its title as the query, and expose a
  clear Cancel action.

### Shopping item rows

- Active rows show completion control, title, optional pack note, quantity
  stepper, catalogue status, best fresh price/store, and an overflow menu.
- The overflow menu contains Match/Rematch and Delete.
- Use the comparison response to display row-level offer information:
  matched, unmatched, no current offer, best fresh public price, and store.
- Do not show stale prices as usable totals. Full retailer offer details belong
  in the Compare tab.

### Comparison flow

- Move comparison fetching to the page so one response powers both item rows
  and the Compare tab.
- Load comparison data when a list is selected. Refresh after add, match,
  rematch, quantity change, completion, or deletion.
- Refactor `SupermarketComparisonPanel` into a presentation-focused component
  receiving comparison data, loading/error state, retry, and match callbacks.
- In the Compare tab, show match readiness and items needing attention first.
- Prioritize the cheapest complete single-store basket and cheapest mixed-store
  basket. Clearly distinguish partial totals and missing items.
- Keep detailed offers, source links, freshness, promotions, and loyalty-only
  prices collapsed by default.
- Matching from Compare should return to List and activate composer match mode.
- Comparison failures must not block normal shopping-list use.

### Templates and responsive behavior

- Move Save as template and template import actions into the Templates menu,
  retaining the existing confirmation and item-selection flows.
- Use existing Tailwind and HouseFlow UI components; add no dependency.
- Use restrained colors, warm neutral surfaces, 44px touch targets, visible
  keyboard focus, concise empty states, and responsive phone/desktop layouts.
- Remove prominent emoji and redundant instructional text.

## Interfaces and compatibility

- No database migration is required.
- No public API response change is required.
- Continue using `/api/prices/search` for products and
  `/api/shopping/compare` for row prices and basket comparison.
- Preserve all current shopping list, item, and template endpoints.
- Preserve authentication, household authorization, exact-product matching,
  price freshness, public-promotion, and loyalty-price behavior.
- Preserve unrelated changes in the dirty worktree.

## Acceptance and validation

- Manual item add and catalogue item add both work without an intermediate
  product-details modal.
- Search failure still permits manual add; stale search responses cannot replace
  newer results.
- Match/rematch, quantity updates, completion, deletion, and filtering work.
- Row prices and comparison results refresh after relevant mutations.
- Unmatched products, stale prices, unavailable products, partial baskets,
  promotions, and loyalty prices remain accurately labelled.
- Empty, archived, and completed-list states are clear and usable.
- List create/rename/archive/delete and template save/import still work.
- Verify keyboard focus order, accessible labels, mobile touch targets, and
  layouts around 390px and 1280px widths.
- Run targeted shopping/comparison tests, `npm test`, `npm run typecheck`,
  focused lint, `npm run build`, and `git diff --check`.

## Current repository context

- Main page: `src/pages/shopping.tsx`.
- Comparison component:
  `src/components/shopping/SupermarketComparisonPanel.tsx`.
- Current page is approximately 1,500 lines and contains overlapping catalogue
  dropdown, search modal, and product-details modal flows.
- Smart and Welbee's catalogue data are present. The comparison UI must remain
  conservative because only exact product matches are eligible.
- The previous implementation attempt did not apply source changes because the
  command sandbox failed before file operations. The sandbox subsequently
  recovered, but this redesign remains unimplemented.
- The worktree contains substantial unrelated user changes; do not revert or
  reformat them.

## New-session continuation prompt

Use this prompt in a new Codex session:

> Implement `docs/SHOPPING_PAGE_REDESIGN_PLAN.md`. Read the repository
> `AGENTS.md` first, preserve the dirty worktree and unrelated changes, and
> validate the focused shopping-page redesign as specified. The plan is already
> approved; do not re-plan it unless repository reality requires a material
> change.

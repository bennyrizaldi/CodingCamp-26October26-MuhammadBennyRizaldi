# Implementation Plan: Expense & Budget Visualizer

## Overview

The implementation builds the Expense & Budget Visualizer as a client-side web application using HTML, CSS, and Vanilla JavaScript, with Chart.js vendored locally. The plan follows the design's pure/impure separation: pure business logic (validation, balance computation, category aggregation, serialization) is implemented and property-tested first, then the side-effecting layers (persistence, DOM renderer, chart service) are built on top, and finally the Controller wires everything together on application load and user events. All application JavaScript lives in a single `js/app.js` file with a conditional CommonJS export so the pure functions are testable in Node without triggering DOM code. Test tooling (Vitest, fast-check, jsdom) lives at the project root outside `js/`.

## Tasks

- [ ] 1. Set up project structure, HTML, and test tooling
  - [x] 1.1 Create the directory structure and `index.html` referencing `css/style.css`, `js/app.js`, and `lib/chart.js` via external `<link>` and `<script>` tags with no inline CSS or JavaScript
    - Create `css/`, `js/`, `lib/`, and `tests/` directories
    - Author `index.html` containing the four named component regions (Total_Balance, Input_Form, Transaction_List, Pie_Chart) and external references only
    - _Requirements: 7.1, 8.2, 9.3, 9.4_

  - [ ] 1.2 Set up Node test tooling: create `package.json` and `vitest.config.js`, and add `vitest`, `fast-check`, and `jsdom` as devDependencies
    - Configure Vitest for native ESM and jsdom environment
    - Test tooling lives at the project root, outside `js/`, so it does not affect the runtime zero-network-requests constraint
    - _Requirements: 8.2_

  - [ ] 1.3 Vendor Chart.js into `lib/chart.js` for local bundling to satisfy the zero-network-requests constraint
    - Place the Chart.js library file under `lib/` and reference it from `index.html` as a separate `<script>`
    - The vendored library in `lib/` does not count against the single-application-JS-file constraint, which governs only code in `js/`
    - _Requirements: 7.4, 8.3, 8.4_

- [ ] 2. Implement pure Validation Layer
  - [ ] 2.1 Implement `validateTransaction`, `isValidAmount`, and `isEmptyOrWhitespace` as pure functions in `js/app.js` with a conditional CommonJS export
    - Trim all fields; reject empty or whitespace-only fields
    - Reject non-numeric, below 0.01, or above 999,999,999.99 amounts
    - Reject item names over 100 characters and categories outside Food/Transport/Fun
    - Return `{ valid, errors, transaction? }`; append a `module.exports` guard for the Node test environment
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ] 2.2 Write property test for valid transaction addition grows the list
    - **Property 1: Valid transaction addition grows the list**
    - **Validates: Requirements 1.3, 2.3**

  - [ ]* 2.3 Write property test for whitespace-only field rejection
    - **Property 2: Whitespace-only fields are rejected**
    - **Validates: Requirements 1.4**

  - [ ]* 2.4 Write property test for out-of-range or non-numeric amount rejection
    - **Property 3: Out-of-range or non-numeric amounts are rejected**
    - **Validates: Requirements 1.5**

  - [ ]* 2.5 Write unit tests for validation edge cases
    - Test item name exceeding 100 characters is rejected
    - Test invalid category value is rejected
    - _Requirements: 1.1, 1.2_

- [ ] 3. Implement State Store and pure computation functions
  - [ ] 3.1 Implement `addTransaction`, `deleteTransaction`, and `getTransactions` in `js/app.js`
    - Append transactions to preserve insertion order
    - `deleteTransaction(id)` returns `true` on success, `false` if not found
    - `getTransactions` returns a defensive copy
    - _Requirements: 2.3, 2.4, 3.1, 3.2_

  - [ ] 3.2 Implement `computeTotalBalance` and `getTotalBalance` (sum of all amounts rounded to two decimals)
    - Apply the `Math.round(value * 100) / 100` rounding helper to aggregation
    - _Requirements: 4.2, 4.4_

  - [ ]* 3.3 Write property test for total balance equals the sum of all amounts
    - **Property 6: Total balance equals the sum of all amounts**
    - **Validates: Requirements 4.2, 4.4**

  - [ ] 3.4 Implement `aggregateByCategory` and `getCategoryTotals` (per-category sums rounded to two decimals)
    - Return a `CategoryTotals` object with Food, Transport, and Fun totals
    - _Requirements: 5.1, 5.2_

  - [ ]* 3.5 Write property test for category totals with positive-total segments only
    - **Property 7: Category totals equal per-category sums with only positive-total segments**
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 3.6 Write property test for insertion order preservation
    - **Property 5: Insertion order is preserved**
    - **Validates: Requirements 2.4**

  - [ ]* 3.7 Write unit tests for state store edge cases
    - Test empty list total balance is zero
    - Test deleting a nonexistent id returns `false` and leaves the list unchanged
    - _Requirements: 4.4, 3.4_

- [ ] 4. Implement Persistence Layer
  - [ ] 4.1 Implement `serializeTransactions` and `deserializeTransactions` as pure functions in `js/app.js`
    - Serialize to a JSON array under a single storage key; preserve insertion order
    - _Requirements: 6.4_

  - [ ]* 4.2 Write property test for serialization round-trip preserves transactions
    - **Property 8: Serialization round-trip preserves transactions**
    - **Validates: Requirements 6.4**

  - [ ] 4.3 Implement `save` and `load` with Local Storage wrapped in try/catch
    - `save` catches `QuotaExceededError`/`SecurityError` and returns a `SaveResult`
    - `load` returns an empty list when the key is absent or when parsing fails; never throws
    - _Requirements: 6.1, 6.5, 6.6_

  - [ ]* 4.4 Write unit tests for persistence edge cases
    - Test missing data initializes an empty list
    - Test corrupt JSON initializes an empty list
    - Test quota exceeded returns a save failure and retains the in-memory list
    - _Requirements: 6.5, 6.6_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement UI Renderer (DOM)
  - [ ] 6.1 Implement a pure `formatTransactionRow` helper and `renderTransactionList` in `js/app.js`
    - Clear the container and append one row per transaction showing Item Name, Amount, and Category
    - Attach a delete control to each row
    - Show the empty-state indicator when the list is empty
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.1, 3.3_

  - [ ]* 6.2 Write property test for transaction row display includes all fields
    - **Property 4: Transaction row display includes all fields**
    - **Validates: Requirements 2.2**

  - [ ] 6.3 Implement `renderTotalBalance`, `renderEmptyListState`, `clearForm`, `showError`, and `clearError` in `js/app.js`
    - Format the balance to two decimals; clear all input fields after a successful add
    - Display errors in a dedicated non-overlapping region and clear stale errors before new operations
    - _Requirements: 1.6, 4.1, 4.4, 3.4_

  - [ ]* 6.4 Write unit tests for renderer
    - Test the empty-state indication is shown when the list is empty
    - Test form fields are cleared after a successful add
    - Test error messages are displayed and then cleared
    - _Requirements: 2.5, 1.6, 3.4_

- [ ] 7. Implement CSS styling
  - [ ] 7.1 Create `css/style.css` with four distinct non-overlapping regions, minimum 16px fonts, 4.5:1 contrast, and a scrollable transaction list
    - Lay out the Total_Balance, Input_Form, Transaction_List, and Pie_Chart as visually distinct, non-overlapping regions
    - Set a scrollable container for the Transaction_List
    - _Requirements: 7.1, 7.2, 2.1_

  - [ ]* 7.2 Write smoke tests for project structure
    - Verify exactly one CSS file in `css/` and exactly one application JS file in `js/`
    - Verify no inline CSS or inline JS in `index.html` and that CSS/JS are referenced externally
    - Verify four distinct non-overlapping regions, font sizes >= 16px, contrast >= 4.5:1, and a scrollable transaction list
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 7.1, 7.2, 2.1_

- [ ] 8. Implement Chart Service (Chart.js wrapper)
  - [ ] 8.1 Implement `init`, `update`, `showNoDataState`, `showLoadFailure`, and `isAvailable` in `js/app.js`
    - Create the pie chart only when `Chart` is defined; otherwise enter a load-failed state
    - Show only categories with a positive total and the no-data state when all totals are zero
    - _Requirements: 5.1, 5.2, 5.4, 8.3, 8.4_

  - [ ]* 8.2 Write unit tests for chart service
    - Test the no-data state is shown for an empty transaction list
    - Test load-failure degradation shows an error indication while keeping the balance and list visible
    - Test the chart is rendered as type `'pie'`
    - _Requirements: 5.4, 8.3, 8.4_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Controller and wire components together
  - [ ] 10.1 Implement `handleSubmit` in `js/app.js`
    - Read form values, validate, and on success add to state, save, re-render list/balance/chart, and clear the form
    - On validation or save failure, display the error and leave the list unchanged
    - _Requirements: 1.3, 1.6, 4.3, 5.3, 6.1, 6.6, 7.3_

  - [ ] 10.2 Implement `handleDelete` in `js/app.js`
    - Show a confirmation prompt; on confirmation delete from state, save, re-render, and show the empty state if the list became empty
    - On deletion failure, display an error and retain the current list
    - _Requirements: 3.2, 3.3, 3.4, 4.3, 5.3_

  - [ ] 10.3 Implement `init` on `DOMContentLoaded` in `js/app.js`
    - Load transactions from Local Storage, render the initial list/balance/chart, initialize the chart service, and wire form and list event listeners
    - Guard DOM initialization with a `document` existence check and attach the namespace to `window`
    - _Requirements: 6.2, 8.4_

  - [ ]* 10.4 Write integration tests and final smoke tests
    - Test add and delete trigger `save` with the updated list (mocked localStorage)
    - Test load on start populates the list from Local Storage
    - Test submit updates all components without a page reload
    - Smoke test that the app uses Local Storage only with no backend or external network requests and no application frameworks
    - _Requirements: 6.1, 6.2, 6.3, 7.3, 8.2_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the eight universal correctness properties from the design; unit and integration tests cover specific examples, edge cases, and side-effecting layers
- All application JavaScript is written into the single `js/app.js` file; these implementation tasks run sequentially (one per dependency-graph wave) to avoid write conflicts on that file, while test tasks target separate test files and can run in parallel with the next implementation step
- Full WCAG conformance for the contrast and font-size requirement requires manual testing with assistive technologies; the automated test verifies computed values programmatically

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "7.1"] },
    { "id": 2, "tasks": ["3.1", "2.2", "2.3", "2.4", "2.5", "7.2"] },
    { "id": 3, "tasks": ["3.2", "3.6"] },
    { "id": 4, "tasks": ["3.4", "3.3", "3.7"] },
    { "id": 5, "tasks": ["4.1", "3.5"] },
    { "id": 6, "tasks": ["4.3", "4.2"] },
    { "id": 7, "tasks": ["6.1", "4.4"] },
    { "id": 8, "tasks": ["6.3", "6.2"] },
    { "id": 9, "tasks": ["8.1", "6.4"] },
    { "id": 10, "tasks": ["10.1", "8.2"] },
    { "id": 11, "tasks": ["10.2"] },
    { "id": 12, "tasks": ["10.3"] },
    { "id": 13, "tasks": ["10.4"] }
  ]
}
```

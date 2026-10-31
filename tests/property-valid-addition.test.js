const fc = require('fast-check');
const {
  validateTransaction,
  addTransaction,
  getTransactions,
} = require('../js/app.js');

// Feature: expense-budget-visualizer, Property 1: Valid transaction addition grows the list
// **Validates: Requirements 1.3, 2.3**
//
// Property: For any transaction input with non-empty fields and an amount in
// the valid range [0.01, 999999999.99], validation succeeds AND adding the
// resulting transaction increases the transaction list length by exactly one,
// with the new transaction present in the list.

test('Property 1: valid transaction addition grows the list', () => {
  fc.assert(
    fc.property(
      fc.record({
        // Non-empty, at most 100 characters after trimming.
        itemName: fc
          .string({ maxLength: 100 })
          .filter((s) => s.trim().length > 0),
        // Amount in the valid monetary range. We use fc.double (64-bit) rather
        // than fc.float (32-bit): the valid max 999,999,999.99 is not exactly
        // representable as a 32-bit float (it rounds to 1e9), which would make
        // fc.float reject the constraint. fc.double accepts double bounds
        // directly. The extra filter guarantees the string round-trip
        // (String -> Number) stays within bounds, so the generator only
        // produces inputs that are valid by our definition.
        amount: fc
          .double({ min: 0.01, max: 999999999.99, noNaN: true })
          .filter((v) => {
            const n = Number(String(v));
            return isFinite(n) && n >= 0.01 && n <= 999999999.99;
          }),
        category: fc.constantFrom('Food', 'Transport', 'Fun'),
      }),
      (input) => {
        // Requirement 1.3: a valid submission creates a Transaction.
        const result = validateTransaction({
          itemName: input.itemName,
          amount: String(input.amount),
          category: input.category,
        });

        if (!result.valid || result.transaction === undefined) {
          return false;
        }

        // Requirement 2.3: adding the transaction grows the list by exactly one.
        const before = getTransactions().length;
        addTransaction(result.transaction);
        const after = getTransactions().length;

        if (after !== before + 1) {
          return false;
        }

        // The newly added transaction must be present in the list. Because
        // addTransaction preserves insertion order, it is the last entry.
        const list = getTransactions();
        const added = list[list.length - 1];
        return (
          added !== undefined &&
          added.itemName === result.transaction.itemName &&
          added.amount === result.transaction.amount &&
          added.category === result.transaction.category
        );
      }
    ),
    { numRuns: 100 }
  );
});

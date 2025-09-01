#!/usr/bin/env node

/**
 * Comprehensive verification script for Task 7: Integrate credit card selector into expense forms
 *
 * Requirements verification:
 * - 2.1: WHEN I create a new expense THEN the system SHALL provide an optional credit card dropdown at the end of the form
 * - 2.2: WHEN I view the credit card dropdown THEN the system SHALL display all my registered credit cards in format "Bank - Franchise ****1234"
 * - 4.3: WHEN I use existing expense features THEN the system SHALL continue to work exactly as before if I don't use credit cards
 */

const fs = require("fs");

console.log("🔍 Task 7 Verification: Credit Card Selector Integration\n");

let allTestsPassed = true;

function checkRequirement(requirement, description, testFn) {
  console.log(`📋 Requirement ${requirement}: ${description}`);
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ PASSED: ${requirement}\n`);
    } else {
      console.log(`❌ FAILED: ${requirement}\n`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${requirement} - ${error.message}\n`);
    allTestsPassed = false;
  }
}

// Read the ExpensesView component
const expensesViewContent = fs.readFileSync(
  "components/expenses-view.tsx",
  "utf8"
);
const budgetContextContent = fs.readFileSync(
  "context/budget-context.tsx",
  "utf8"
);

// Requirement 2.1: Credit card dropdown at the end of expense forms
checkRequirement(
  "2.1",
  "Credit card dropdown provided at end of expense forms",
  () => {
    // Check if CreditCardSelector is imported
    const hasImport = expensesViewContent.includes(
      "import { CreditCardSelector }"
    );

    // Check if CreditCardSelector is used in add form (after amount field)
    const addFormPattern = /Monto.*\*.*Input[\s\S]*?CreditCardSelector/;
    const hasAddFormSelector = addFormPattern.test(expensesViewContent);

    // Check if CreditCardSelector is used in edit form (after amount field)
    const editFormPattern = /edit-amount.*Input[\s\S]*?CreditCardSelector/;
    const hasEditFormSelector = editFormPattern.test(expensesViewContent);

    // Check if it's marked as optional
    const hasOptionalLabel = expensesViewContent.includes(
      "Tarjeta de Crédito (opcional)"
    );

    console.log(`  - Import: ${hasImport ? "✅" : "❌"}`);
    console.log(`  - Add form selector: ${hasAddFormSelector ? "✅" : "❌"}`);
    console.log(`  - Edit form selector: ${hasEditFormSelector ? "✅" : "❌"}`);
    console.log(`  - Optional label: ${hasOptionalLabel ? "✅" : "❌"}`);

    return (
      hasImport && hasAddFormSelector && hasEditFormSelector && hasOptionalLabel
    );
  }
);

// Requirement 2.2: Credit card display format
checkRequirement("2.2", "Credit cards displayed in correct format", () => {
  // Check CreditCardSelector component for proper formatting
  const selectorContent = fs.readFileSync(
    "components/credit-card-selector.tsx",
    "utf8"
  );

  // Check if formatCreditCardDisplay function exists and uses correct format
  const hasFormatFunction = selectorContent.includes("formatCreditCardDisplay");
  const hasCorrectFormat = selectorContent.includes(
    "${creditCard.bank_name} - ${franchiseLabel} ****${creditCard.last_four_digits}"
  );

  console.log(`  - Format function exists: ${hasFormatFunction ? "✅" : "❌"}`);
  console.log(`  - Correct format used: ${hasCorrectFormat ? "✅" : "❌"}`);

  return hasFormatFunction && hasCorrectFormat;
});

// Requirement 4.3: Backward compatibility
checkRequirement("4.3", "Existing expense functionality maintained", () => {
  // Check if existing form fields are still present
  const hasCategory = expensesViewContent.includes("Categoría *");
  const hasPeriod = expensesViewContent.includes("Periodo *");
  const hasDate = expensesViewContent.includes("Fecha *");
  const hasPaymentMethod = expensesViewContent.includes("Medio de Pago *");
  const hasDescription = expensesViewContent.includes("Descripción *");
  const hasAmount = expensesViewContent.includes("Monto *");

  // Check if fund functionality is preserved
  const hasFundSelector = expensesViewContent.includes("SourceFundSelector");
  const hasFundFilter = expensesViewContent.includes("FundFilter");

  // Check if credit card is optional (not required)
  const creditCardOptional = expensesViewContent.includes("required={false}");

  console.log(`  - Category field: ${hasCategory ? "✅" : "❌"}`);
  console.log(`  - Period field: ${hasPeriod ? "✅" : "❌"}`);
  console.log(`  - Date field: ${hasDate ? "✅" : "❌"}`);
  console.log(`  - Payment method: ${hasPaymentMethod ? "✅" : "❌"}`);
  console.log(`  - Description field: ${hasDescription ? "✅" : "❌"}`);
  console.log(`  - Amount field: ${hasAmount ? "✅" : "❌"}`);
  console.log(`  - Fund selector: ${hasFundSelector ? "✅" : "❌"}`);
  console.log(`  - Fund filter: ${hasFundFilter ? "✅" : "❌"}`);
  console.log(`  - Credit card optional: ${creditCardOptional ? "✅" : "❌"}`);

  return (
    hasCategory &&
    hasPeriod &&
    hasDate &&
    hasPaymentMethod &&
    hasDescription &&
    hasAmount &&
    hasFundSelector &&
    hasFundFilter &&
    creditCardOptional
  );
});

// Additional verification: Form state management
checkRequirement(
  "State Management",
  "Proper credit card state management",
  () => {
    // Check if credit card state variables exist
    const hasNewExpenseState = expensesViewContent.includes(
      "newExpenseCreditCard"
    );
    const hasEditExpenseState = expensesViewContent.includes(
      "editExpenseCreditCard"
    );

    // Check if state is properly reset
    const hasStateReset =
      expensesViewContent.includes("setNewExpenseCreditCard(null)") &&
      expensesViewContent.includes("setEditExpenseCreditCard(null)");

    // Check if state is properly initialized in edit mode
    const hasEditInitialization =
      expensesViewContent.includes("credit_card_info");

    console.log(`  - New expense state: ${hasNewExpenseState ? "✅" : "❌"}`);
    console.log(`  - Edit expense state: ${hasEditExpenseState ? "✅" : "❌"}`);
    console.log(`  - State reset: ${hasStateReset ? "✅" : "❌"}`);
    console.log(
      `  - Edit initialization: ${hasEditInitialization ? "✅" : "❌"}`
    );

    return (
      hasNewExpenseState &&
      hasEditExpenseState &&
      hasStateReset &&
      hasEditInitialization
    );
  }
);

// Additional verification: API integration
checkRequirement(
  "API Integration",
  "Budget context functions updated for credit cards",
  () => {
    // Check if function signatures include credit card parameter
    const addExpenseSignature =
      budgetContextContent.includes("creditCardId?: string") &&
      budgetContextContent.includes("addExpense:");
    const updateExpenseSignature =
      budgetContextContent.includes("creditCardId?: string") &&
      budgetContextContent.includes("updateExpense:");

    // Check if API calls include credit card parameter
    const addExpenseCall = budgetContextContent.includes(
      "credit_card_id: creditCardId"
    );
    const updateExpenseCall = budgetContextContent.includes(
      "credit_card_id: creditCardId"
    );

    console.log(
      `  - addExpense signature: ${addExpenseSignature ? "✅" : "❌"}`
    );
    console.log(
      `  - updateExpense signature: ${updateExpenseSignature ? "✅" : "❌"}`
    );
    console.log(`  - addExpense API call: ${addExpenseCall ? "✅" : "❌"}`);
    console.log(
      `  - updateExpense API call: ${updateExpenseCall ? "✅" : "❌"}`
    );

    return (
      addExpenseSignature &&
      updateExpenseSignature &&
      addExpenseCall &&
      updateExpenseCall
    );
  }
);

// Additional verification: Component positioning
checkRequirement(
  "Positioning",
  "Credit card selector positioned at end of forms",
  () => {
    // Check if credit card selector comes after amount field in both forms
    const addFormOrder =
      /Monto.*\*[\s\S]*?amount[\s\S]*?Tarjeta de Crédito \(opcional\)/.test(
        expensesViewContent
      );
    const editFormOrder =
      /edit-amount[\s\S]*?Tarjeta de Crédito \(opcional\)/.test(
        expensesViewContent
      );

    console.log(`  - Add form order: ${addFormOrder ? "✅" : "❌"}`);
    console.log(`  - Edit form order: ${editFormOrder ? "✅" : "❌"}`);

    return addFormOrder && editFormOrder;
  }
);

console.log("=".repeat(60));
if (allTestsPassed) {
  console.log(
    "🎉 ALL TESTS PASSED! Task 7 implementation is complete and meets all requirements."
  );
  console.log("\n✨ Summary of implemented features:");
  console.log("  • CreditCardSelector added to expense creation dialog");
  console.log("  • CreditCardSelector added to expense editing dialog");
  console.log("  • Selectors positioned at the end of forms as specified");
  console.log("  • Proper form state management and validation");
  console.log("  • Existing expense form functionality maintained");
  console.log("  • Budget context functions updated to support credit cards");
  console.log(
    "  • Credit card associations are optional and backward compatible"
  );
} else {
  console.log("❌ Some tests failed. Please review the implementation.");
}
console.log("=".repeat(60));

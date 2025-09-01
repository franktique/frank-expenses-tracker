/**
 * Debug script for credit card deletion issue
 * This script helps debug the specific issue where deletion shows 944 expenses
 * when the credit card is not actually associated with any expenses
 */

const debugCreditCardDeletion = async () => {
  console.log("🔍 Debugging Credit Card Deletion Issue...\n");

  try {
    // Step 1: Get all expenses and count them
    console.log("1. Analyzing all expenses...");
    const allExpensesResponse = await fetch(
      "http://localhost:3000/api/expenses"
    );

    if (!allExpensesResponse.ok) {
      console.log("❌ Failed to fetch expenses:", allExpensesResponse.status);
      return;
    }

    const allExpenses = await allExpensesResponse.json();
    console.log(`   Total expenses in database: ${allExpenses.length}`);

    // Step 2: Analyze credit card associations
    const expensesWithCreditCards = allExpenses.filter(
      (expense) =>
        expense.credit_card_id !== null && expense.credit_card_id !== undefined
    );
    const expensesWithoutCreditCards = allExpenses.filter(
      (expense) =>
        expense.credit_card_id === null || expense.credit_card_id === undefined
    );

    console.log(
      `   Expenses WITH credit cards: ${expensesWithCreditCards.length}`
    );
    console.log(
      `   Expenses WITHOUT credit cards: ${expensesWithoutCreditCards.length}`
    );

    // Step 3: Get all credit cards
    console.log("\n2. Getting all credit cards...");
    const creditCardsResponse = await fetch(
      "http://localhost:3000/api/credit-cards"
    );

    if (!creditCardsResponse.ok) {
      console.log(
        "❌ Failed to fetch credit cards:",
        creditCardsResponse.status
      );
      return;
    }

    const creditCards = await creditCardsResponse.json();
    console.log(`   Total credit cards: ${creditCards.length}`);

    // Step 4: Test each credit card's expense count
    console.log("\n3. Testing expense count for each credit card...");

    for (const card of creditCards) {
      console.log(
        `\n   Testing Credit Card: ${card.bank_name} - ${card.franchise} ****${card.last_four_digits}`
      );
      console.log(`   Credit Card ID: ${card.id}`);

      // Test the API endpoint that the component uses
      const filterResponse = await fetch(
        `http://localhost:3000/api/expenses?credit_card_id=${card.id}`
      );

      if (filterResponse.ok) {
        const filteredExpenses = await filterResponse.json();
        console.log(`   ✅ API returns: ${filteredExpenses.length} expenses`);

        // Double-check by manually counting in all expenses
        const manualCount = allExpenses.filter(
          (expense) => expense.credit_card_id === card.id
        ).length;
        console.log(`   ✅ Manual count: ${manualCount} expenses`);

        if (filteredExpenses.length !== manualCount) {
          console.log(
            `   ❌ MISMATCH! API count (${filteredExpenses.length}) != Manual count (${manualCount})`
          );
        } else {
          console.log(`   ✅ Counts match correctly`);
        }

        // Show some details if there are expenses
        if (filteredExpenses.length > 0) {
          console.log(`   📋 Sample expenses for this card:`);
          filteredExpenses.slice(0, 3).forEach((expense, index) => {
            console.log(
              `     ${index + 1}. ${expense.description} - $${
                expense.amount
              } (${expense.date})`
            );
          });
        }
      } else {
        console.log(
          `   ❌ Failed to filter expenses for card ${card.id}:`,
          filterResponse.status
        );
      }
    }

    // Step 5: Simulate the validation function
    console.log("\n4. Simulating credit card deletion validation...");

    if (creditCards.length > 0) {
      const testCard = creditCards[0]; // Test with the first card
      console.log(
        `   Testing with card: ${testCard.bank_name} - ${testCard.franchise} ****${testCard.last_four_digits}`
      );

      // This is exactly what the component does
      const validationResponse = await fetch(
        `/api/expenses?credit_card_id=${testCard.id}`
      );

      if (validationResponse.ok) {
        const expenses = await validationResponse.json();
        const expenseCount = expenses.length;

        console.log(`   ✅ Validation result: ${expenseCount} expenses`);
        console.log(`   ✅ Has expenses: ${expenseCount > 0}`);

        if (expenseCount === 944 && expenseCount === allExpenses.length) {
          console.log(
            `   ❌ PROBLEM IDENTIFIED: The API is returning ALL expenses instead of filtered ones!`
          );
          console.log(
            `   ❌ This means the credit_card_id filter is not working properly.`
          );
        } else {
          console.log(`   ✅ Filter appears to be working correctly.`);
        }
      } else {
        console.log(
          `   ❌ Validation request failed:`,
          validationResponse.status
        );
      }
    }

    console.log("\n🎯 Summary:");
    console.log(`   Total expenses: ${allExpenses.length}`);
    console.log(
      `   Expenses with credit cards: ${expensesWithCreditCards.length}`
    );
    console.log(`   Total credit cards: ${creditCards.length}`);

    if (allExpenses.length === 944) {
      console.log(
        `   ⚠️  The number 944 matches total expenses - this suggests the filter was not working before the fix.`
      );
    }
  } catch (error) {
    console.error("❌ Debug failed with error:", error.message);
  }
};

// Run the debug
debugCreditCardDeletion();

/**
 * Test script to verify credit card filtering in expenses API
 * This script tests the fix for the credit card deletion validation issue
 */

const testCreditCardFilter = async () => {
  console.log("🧪 Testing Credit Card Filter Fix...\n");

  try {
    // Test 1: Get all expenses to see the total count
    console.log("1. Getting total expenses count...");
    const allExpensesResponse = await fetch(
      "http://localhost:3000/api/expenses"
    );

    if (allExpensesResponse.ok) {
      const allExpenses = await allExpensesResponse.json();
      console.log(`✅ Total expenses in database: ${allExpenses.length}`);

      // Show some sample expenses with credit card info
      const expensesWithCreditCards = allExpenses.filter(
        (expense) => expense.credit_card_id
      );
      console.log(
        `   Expenses with credit cards: ${expensesWithCreditCards.length}`
      );

      if (expensesWithCreditCards.length > 0) {
        console.log("   Sample expenses with credit cards:");
        expensesWithCreditCards.slice(0, 3).forEach((expense, index) => {
          console.log(
            `     ${index + 1}. ID: ${expense.id}, Credit Card ID: ${
              expense.credit_card_id
            }, Amount: ${expense.amount}`
          );
        });
      }
    } else {
      console.log(
        "❌ Failed to fetch all expenses:",
        allExpensesResponse.status
      );
      return;
    }

    // Test 2: Get all credit cards
    console.log("\n2. Getting all credit cards...");
    const creditCardsResponse = await fetch(
      "http://localhost:3000/api/credit-cards"
    );

    if (creditCardsResponse.ok) {
      const creditCards = await creditCardsResponse.json();
      console.log(`✅ Total credit cards: ${creditCards.length}`);

      if (creditCards.length > 0) {
        console.log("   Available credit cards:");
        creditCards.forEach((card, index) => {
          console.log(
            `     ${index + 1}. ID: ${card.id}, Bank: ${
              card.bank_name
            }, Franchise: ${card.franchise}`
          );
        });

        // Test 3: Test filtering by each credit card
        console.log("\n3. Testing credit card filtering...");
        for (const card of creditCards) {
          const filterResponse = await fetch(
            `http://localhost:3000/api/expenses?credit_card_id=${card.id}`
          );

          if (filterResponse.ok) {
            const filteredExpenses = await filterResponse.json();
            console.log(
              `   ✅ Credit Card ${card.bank_name} (${card.id}): ${filteredExpenses.length} expenses`
            );

            // Verify that all returned expenses actually have this credit card ID
            const incorrectExpenses = filteredExpenses.filter(
              (expense) => expense.credit_card_id !== card.id
            );
            if (incorrectExpenses.length > 0) {
              console.log(
                `   ❌ ERROR: Found ${incorrectExpenses.length} expenses with wrong credit card ID!`
              );
            } else {
              console.log(
                `   ✅ All returned expenses correctly match credit card ID`
              );
            }
          } else {
            console.log(
              `   ❌ Failed to filter by credit card ${card.id}:`,
              filterResponse.status
            );
          }
        }

        // Test 4: Test with a non-existent credit card ID
        console.log("\n4. Testing with non-existent credit card ID...");
        const nonExistentId = "00000000-0000-0000-0000-000000000000";
        const nonExistentResponse = await fetch(
          `http://localhost:3000/api/expenses?credit_card_id=${nonExistentId}`
        );

        if (nonExistentResponse.ok) {
          const nonExistentExpenses = await nonExistentResponse.json();
          console.log(
            `   ✅ Non-existent credit card filter: ${nonExistentExpenses.length} expenses (should be 0)`
          );

          if (nonExistentExpenses.length === 0) {
            console.log(
              "   ✅ Correctly returns empty array for non-existent credit card"
            );
          } else {
            console.log(
              "   ❌ ERROR: Should return empty array for non-existent credit card"
            );
          }
        } else {
          console.log(
            "   ❌ Failed to test non-existent credit card filter:",
            nonExistentResponse.status
          );
        }
      } else {
        console.log("   ⚠️  No credit cards found in database");
      }
    } else {
      console.log(
        "❌ Failed to fetch credit cards:",
        creditCardsResponse.status
      );
    }

    console.log("\n🎉 Credit Card Filter Test Complete!");
    console.log("\nThe fix should now:");
    console.log("✅ Correctly filter expenses by credit_card_id");
    console.log("✅ Show accurate count when validating credit card deletion");
    console.log("✅ Prevent false warnings about associated expenses");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.log("\nThis might be expected if:");
    console.log("1. The development server is not running");
    console.log("2. The database is not set up");
    console.log("3. Credit card migration hasn't been run");
  }
};

// Run the test
testCreditCardFilter();

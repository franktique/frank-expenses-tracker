/**
 * Test script for credit card deletion API
 * This script tests the newly implemented DELETE endpoint
 */

const testCreditCardDeletionAPI = async () => {
  console.log("🧪 Testing Credit Card Deletion API...\n");

  try {
    // Test 1: Get all credit cards
    console.log("1. Getting all credit cards...");
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
    console.log(`✅ Found ${creditCards.length} credit cards`);

    if (creditCards.length === 0) {
      console.log("⚠️  No credit cards found. Creating a test card first...");

      // Create a test credit card
      const createResponse = await fetch(
        "http://localhost:3000/api/credit-cards",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bank_name: "Banco Test",
            franchise: "visa",
            last_four_digits: "9999",
          }),
        }
      );

      if (createResponse.ok) {
        const newCard = await createResponse.json();
        console.log(
          `✅ Created test card: ${newCard.bank_name} - ${newCard.franchise} ****${newCard.last_four_digits}`
        );
        creditCards.push(newCard);
      } else {
        console.log("❌ Failed to create test card");
        return;
      }
    }

    // Test 2: Test deletion of a credit card
    const testCard = creditCards[0];
    console.log(
      `\n2. Testing deletion of card: ${testCard.bank_name} - ${testCard.franchise} ****${testCard.last_four_digits}`
    );
    console.log(`   Card ID: ${testCard.id}`);

    // First, check if this card has any associated expenses
    const expensesResponse = await fetch(
      `http://localhost:3000/api/expenses?credit_card_id=${testCard.id}`
    );

    if (expensesResponse.ok) {
      const expenses = await expensesResponse.json();
      console.log(`   Associated expenses: ${expenses.length}`);
    } else {
      console.log("   ⚠️  Could not check associated expenses");
    }

    // Test the DELETE endpoint
    const deleteResponse = await fetch(
      `http://localhost:3000/api/credit-cards/${testCard.id}`,
      {
        method: "DELETE",
      }
    );

    console.log(`   DELETE response status: ${deleteResponse.status}`);

    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log("   ✅ Deletion successful!");
      console.log(`   Response:`, deleteResult);

      if (deleteResult.removedAssociations > 0) {
        console.log(
          `   📋 Removed ${deleteResult.removedAssociations} expense associations`
        );
      }
    } else {
      const errorText = await deleteResponse.text();
      console.log("   ❌ Deletion failed!");
      console.log(`   Error: ${errorText}`);
    }

    // Test 3: Verify the card was actually deleted
    console.log("\n3. Verifying deletion...");
    const verifyResponse = await fetch(
      `http://localhost:3000/api/credit-cards/${testCard.id}`
    );

    if (verifyResponse.status === 404) {
      console.log("   ✅ Card successfully deleted (404 Not Found)");
    } else if (verifyResponse.ok) {
      console.log("   ❌ Card still exists after deletion!");
    } else {
      console.log(`   ⚠️  Unexpected response: ${verifyResponse.status}`);
    }

    // Test 4: Test deletion of non-existent card
    console.log("\n4. Testing deletion of non-existent card...");
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const nonExistentResponse = await fetch(
      `http://localhost:3000/api/credit-cards/${nonExistentId}`,
      {
        method: "DELETE",
      }
    );

    if (nonExistentResponse.status === 404) {
      console.log("   ✅ Correctly returns 404 for non-existent card");
    } else {
      console.log(
        `   ❌ Unexpected response for non-existent card: ${nonExistentResponse.status}`
      );
    }

    console.log("\n🎉 Credit Card Deletion API Test Complete!");
    console.log("\nThe API should now:");
    console.log("✅ Successfully delete credit cards");
    console.log(
      "✅ Remove associations with expenses (set credit_card_id to NULL)"
    );
    console.log("✅ Return proper JSON responses");
    console.log("✅ Handle non-existent cards gracefully");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.log("\nThis might be expected if:");
    console.log("1. The development server is not running");
    console.log("2. The database is not set up");
    console.log("3. Credit card migration hasn't been run");
  }
};

// Run the test
testCreditCardDeletionAPI();

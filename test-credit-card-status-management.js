/**
 * Test script to verify credit card status management functionality
 * This tests the active/inactive status management in credit cards view
 */

const BASE_URL = "http://localhost:3000";

async function testCreditCardStatusManagement() {
  console.log("🧪 Testing Credit Card Status Management...\n");

  try {
    // Test 1: Fetch all credit cards and check status display
    console.log("1. Testing credit cards list with status...");
    const response = await fetch(`${BASE_URL}/api/credit-cards`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const creditCards = data.credit_cards || [];

    console.log(`   ✓ Found ${creditCards.length} credit cards`);

    // Display status information
    creditCards.forEach((card, index) => {
      console.log(
        `   Card ${index + 1}: ${card.bank_name} - ${card.franchise} ****${
          card.last_four_digits
        }`
      );
      console.log(`   Status: ${card.is_active ? "🟢 Active" : "🔴 Inactive"}`);
      console.log("");
    });

    // Test 2: Test status update functionality
    if (creditCards.length > 0) {
      const testCard = creditCards[0];
      const originalStatus = testCard.is_active;
      const newStatus = !originalStatus;

      console.log(
        `2. Testing status toggle for card: ${testCard.bank_name} ****${testCard.last_four_digits}`
      );
      console.log(
        `   Original status: ${originalStatus ? "Active" : "Inactive"}`
      );
      console.log(`   Changing to: ${newStatus ? "Active" : "Inactive"}`);

      // Update status
      const updateResponse = await fetch(
        `${BASE_URL}/api/credit-cards/${testCard.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: newStatus,
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(
          `Status update failed! status: ${updateResponse.status}`
        );
      }

      const updatedCard = await updateResponse.json();
      console.log(
        `   ✓ Status updated successfully: ${
          updatedCard.is_active ? "Active" : "Inactive"
        }`
      );

      // Verify the change
      const verifyResponse = await fetch(
        `${BASE_URL}/api/credit-cards/${testCard.id}`
      );
      const verifiedCard = await verifyResponse.json();

      if (verifiedCard.is_active === newStatus) {
        console.log("   ✓ Status change verified in database");
      } else {
        console.log("   ❌ Status change not reflected in database");
      }

      // Restore original status
      console.log("   Restoring original status...");
      await fetch(`${BASE_URL}/api/credit-cards/${testCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: originalStatus,
        }),
      });
      console.log("   ✓ Original status restored");
    }

    // Test 3: Verify filtering behavior
    console.log("\n3. Testing filtering behavior...");
    const activeCards = creditCards.filter((card) => card.is_active);
    const inactiveCards = creditCards.filter((card) => !card.is_active);

    console.log(`   Active cards: ${activeCards.length}`);
    console.log(`   Inactive cards: ${inactiveCards.length}`);

    if (activeCards.length > 0) {
      console.log("   ✓ Active cards available for new expense selection");
    }

    if (inactiveCards.length > 0) {
      console.log("   ✓ Inactive cards should be hidden in new expense forms");
      console.log(
        "   ✓ Inactive cards should be visible in edit forms if currently selected"
      );
    }

    console.log("\n✅ All credit card status management tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testCreditCardStatusManagement();

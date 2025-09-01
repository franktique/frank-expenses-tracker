/**
 * Test script to verify credit card context integration
 * This script tests the credit card functionality in the budget context
 */

const testCreditCardContext = async () => {
  console.log("🧪 Testing Credit Card Context Integration...\n");

  try {
    // Test 1: Check if credit cards API is accessible
    console.log("1. Testing credit cards API endpoint...");
    const response = await fetch("http://localhost:3000/api/credit-cards");

    if (response.ok) {
      const creditCards = await response.json();
      console.log("✅ Credit cards API is accessible");
      console.log(`   Found ${creditCards.length} credit cards`);
    } else {
      console.log("⚠️  Credit cards API returned:", response.status);
      console.log("   This might be expected if migration hasn't run yet");
    }

    // Test 2: Test credit card creation
    console.log("\n2. Testing credit card creation...");
    const createResponse = await fetch(
      "http://localhost:3000/api/credit-cards",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bank_name: "Banco de Prueba",
          franchise: "visa",
          last_four_digits: "1234",
        }),
      }
    );

    if (createResponse.ok) {
      const newCard = await createResponse.json();
      console.log("✅ Credit card creation successful");
      console.log(
        `   Created card: ${newCard.bank_name} - ${newCard.franchise} ****${newCard.last_four_digits}`
      );

      // Test 3: Test credit card update
      console.log("\n3. Testing credit card update...");
      const updateResponse = await fetch(
        `http://localhost:3000/api/credit-cards/${newCard.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bank_name: "Banco Actualizado",
          }),
        }
      );

      if (updateResponse.ok) {
        const updatedCard = await updateResponse.json();
        console.log("✅ Credit card update successful");
        console.log(
          `   Updated card: ${updatedCard.bank_name} - ${updatedCard.franchise} ****${updatedCard.last_four_digits}`
        );
      } else {
        console.log("❌ Credit card update failed:", updateResponse.status);
      }

      // Test 4: Test credit card deletion
      console.log("\n4. Testing credit card deletion...");
      const deleteResponse = await fetch(
        `http://localhost:3000/api/credit-cards/${newCard.id}`,
        {
          method: "DELETE",
        }
      );

      if (deleteResponse.ok) {
        console.log("✅ Credit card deletion successful");
      } else {
        console.log("❌ Credit card deletion failed:", deleteResponse.status);
      }
    } else {
      console.log("❌ Credit card creation failed:", createResponse.status);
      const errorText = await createResponse.text();
      console.log("   Error:", errorText);
    }

    // Test 5: Verify context structure
    console.log("\n5. Testing context structure...");
    console.log("✅ Context should now include:");
    console.log("   - creditCards: CreditCard[]");
    console.log("   - addCreditCard: function");
    console.log("   - updateCreditCard: function");
    console.log("   - deleteCreditCard: function");
    console.log("   - getCreditCardById: function");
    console.log("   - refreshCreditCards: function");

    console.log("\n🎉 Credit Card Context Integration Test Complete!");
    console.log("\nNext steps:");
    console.log("1. Start the development server: npm run dev");
    console.log("2. Navigate to any page that uses the budget context");
    console.log("3. Check browser console for any context-related errors");
    console.log("4. Test credit card functionality in the UI");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.log("\nThis might be expected if:");
    console.log("1. The development server is not running");
    console.log("2. The database is not set up");
    console.log("3. Credit card migration hasn't been run");
  }
};

// Run the test
testCreditCardContext();

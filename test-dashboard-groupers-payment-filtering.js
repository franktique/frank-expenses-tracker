/**
 * Test script for dashboard groupers payment method filtering
 * This script tests the new payment method filtering functionality
 */

const BASE_URL = "http://localhost:3000";

async function testDashboardGroupersPaymentFiltering() {
  console.log("🧪 Testing Dashboard Groupers Payment Method Filtering...\n");

  try {
    // Test 1: Basic functionality without estudioId (legacy behavior)
    console.log("📋 Test 1: Legacy behavior without estudioId");
    const legacyResponse = await fetch(
      `${BASE_URL}/api/dashboard/groupers?periodId=1`
    );

    if (legacyResponse.ok) {
      const legacyData = await legacyResponse.json();
      console.log("✅ Legacy API call successful");
      console.log(`   Found ${legacyData.length} groupers`);
    } else {
      console.log("❌ Legacy API call failed:", legacyResponse.status);
    }

    // Test 2: With estudioId (new payment method filtering)
    console.log("\n📋 Test 2: New behavior with estudioId");
    const estudioResponse = await fetch(
      `${BASE_URL}/api/dashboard/groupers?periodId=1&estudioId=1`
    );

    if (estudioResponse.ok) {
      const estudioData = await estudioResponse.json();
      console.log("✅ Estudio API call successful");
      console.log(
        `   Found ${estudioData.length} groupers with payment method filtering`
      );
    } else {
      console.log("❌ Estudio API call failed:", estudioResponse.status);
    }

    // Test 3: With estudioId and budgets
    console.log("\n📋 Test 3: With estudioId and budget inclusion");
    const budgetResponse = await fetch(
      `${BASE_URL}/api/dashboard/groupers?periodId=1&estudioId=1&includeBudgets=true`
    );

    if (budgetResponse.ok) {
      const budgetData = await budgetResponse.json();
      console.log("✅ Budget API call successful");
      console.log(
        `   Found ${budgetData.length} groupers with budget data and payment filtering`
      );

      // Check if budget_amount field is present
      if (budgetData.length > 0 && budgetData[0].budget_amount !== undefined) {
        console.log("✅ Budget amounts included in response");
      }
    } else {
      console.log("❌ Budget API call failed:", budgetResponse.status);
    }

    // Test 4: Legacy payment method parameter (backward compatibility)
    console.log("\n📋 Test 4: Legacy payment method parameter");
    const legacyPaymentResponse = await fetch(
      `${BASE_URL}/api/dashboard/groupers?periodId=1&expensePaymentMethods=cash,credit`
    );

    if (legacyPaymentResponse.ok) {
      const legacyPaymentData = await legacyPaymentResponse.json();
      console.log("✅ Legacy payment method filtering successful");
      console.log(
        `   Found ${legacyPaymentData.length} groupers with legacy payment filtering`
      );
    } else {
      console.log(
        "❌ Legacy payment method filtering failed:",
        legacyPaymentResponse.status
      );
    }

    // Test 5: Error handling - invalid estudioId
    console.log("\n📋 Test 5: Error handling with invalid estudioId");
    const errorResponse = await fetch(
      `${BASE_URL}/api/dashboard/groupers?periodId=1&estudioId=invalid`
    );

    if (!errorResponse.ok) {
      console.log("✅ Error handling working correctly for invalid estudioId");
    } else {
      console.log("❌ Should have failed with invalid estudioId");
    }

    console.log("\n🎉 Dashboard Groupers Payment Filtering Tests Complete!");
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDashboardGroupersPaymentFiltering();
}

module.exports = { testDashboardGroupersPaymentFiltering };

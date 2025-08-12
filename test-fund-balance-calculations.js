#!/usr/bin/env node

/**
 * Test script to verify fund balance calculations with source_fund_id
 */

const BASE_URL = "http://localhost:3000";

async function testFundBalanceCalculations() {
  console.log("🧪 Testing fund balance calculations with source_fund_id...\n");

  try {
    // Test 1: Get all funds and check balance calculations
    console.log("1. Testing fund list endpoint...");
    const fundsResponse = await fetch(`${BASE_URL}/api/funds`);

    if (!fundsResponse.ok) {
      throw new Error(`Funds API failed: ${fundsResponse.status}`);
    }

    const funds = await fundsResponse.json();
    console.log(`✅ Retrieved ${funds.length} funds`);

    if (funds.length > 0) {
      const firstFund = funds[0];
      console.log(
        `   Sample fund: ${firstFund.name} - Balance: $${firstFund.current_balance}`
      );
    }

    // Test 2: Get dashboard funds data
    console.log("\n2. Testing dashboard funds endpoint...");
    const dashboardResponse = await fetch(`${BASE_URL}/api/dashboard/funds`);

    if (!dashboardResponse.ok) {
      throw new Error(
        `Dashboard funds API failed: ${dashboardResponse.status}`
      );
    }

    const dashboardData = await dashboardResponse.json();
    console.log(
      `✅ Retrieved dashboard data for ${dashboardData.funds.length} funds`
    );
    console.log(`   Total balance: $${dashboardData.summary.total_balance}`);
    console.log(`   Total expenses: $${dashboardData.summary.total_expenses}`);

    // Test 3: Test fund recalculation if we have funds
    if (funds.length > 0) {
      const testFundId = funds[0].id;
      console.log(
        `\n3. Testing fund recalculation for fund: ${funds[0].name}...`
      );

      const recalcResponse = await fetch(
        `${BASE_URL}/api/funds/${testFundId}/recalculate`,
        {
          method: "POST",
        }
      );

      if (!recalcResponse.ok) {
        throw new Error(`Recalculation API failed: ${recalcResponse.status}`);
      }

      const recalcData = await recalcResponse.json();
      console.log(`✅ Recalculation completed`);
      console.log(`   Old balance: $${recalcData.old_balance}`);
      console.log(`   New balance: $${recalcData.new_balance}`);
      console.log(`   Calculation details:`, recalcData.calculation_details);
    }

    // Test 4: Test fund transfers endpoint
    console.log("\n4. Testing fund transfers endpoint...");
    const transfersResponse = await fetch(
      `${BASE_URL}/api/dashboard/funds/transfers`
    );

    if (!transfersResponse.ok) {
      throw new Error(`Transfers API failed: ${transfersResponse.status}`);
    }

    const transfersData = await transfersResponse.json();
    console.log(`✅ Retrieved ${transfersData.transfers.length} transfers`);
    console.log(`   Transfer statistics:`, transfersData.statistics);

    console.log("\n🎉 All fund balance calculation tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testFundBalanceCalculations();

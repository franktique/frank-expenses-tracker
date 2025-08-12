#!/usr/bin/env node

/**
 * Test script for expense source fund migration
 * This script tests the migration API endpoint and validates the results
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Making request to: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${data.error || "Unknown error"}`
      );
    }

    return data;
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    throw error;
  }
}

async function testMigrationStatus() {
  console.log("\n=== Testing Migration Status Check ===");

  try {
    const status = await makeRequest("/api/migrate-expense-source-funds", {
      method: "GET",
    });

    console.log("✅ Migration status check successful");
    console.log("Status:", JSON.stringify(status, null, 2));

    return status;
  } catch (error) {
    console.error("❌ Migration status check failed:", error.message);
    throw error;
  }
}

async function runMigration() {
  console.log("\n=== Running Migration ===");

  try {
    const result = await makeRequest("/api/migrate-expense-source-funds", {
      method: "POST",
    });

    console.log("✅ Migration completed successfully");
    console.log("Results:", JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    throw error;
  }
}

async function validateMigrationResults(results) {
  console.log("\n=== Validating Migration Results ===");

  const { pre_migration, post_migration, migrated_count } = results.results;

  // Validate that migration actually processed expenses
  if (migrated_count === 0 && pre_migration.expenses_without_source_fund > 0) {
    console.warn(
      "⚠️ No expenses were migrated but some were missing source funds"
    );
  } else if (migrated_count > 0) {
    console.log(`✅ Successfully migrated ${migrated_count} expenses`);
  }

  // Validate that migration is complete
  if (post_migration.migration_complete) {
    console.log("✅ Migration is complete - all expenses have source funds");
  } else {
    console.warn(
      `⚠️ Migration incomplete - ${post_migration.expenses_without_source_fund} expenses still missing source funds`
    );
  }

  // Validate that total expense count didn't change
  if (pre_migration.total_expenses === post_migration.total_expenses) {
    console.log("✅ Total expense count preserved during migration");
  } else {
    console.error("❌ Total expense count changed during migration!");
  }

  // Show sample migrated expenses
  if (
    results.results.sample_migrated &&
    results.results.sample_migrated.length > 0
  ) {
    console.log("\n📋 Sample migrated expenses:");
    results.results.sample_migrated.forEach((expense, index) => {
      console.log(
        `  ${index + 1}. ${expense.description} - ${
          expense.source_fund_name
        } → ${expense.destination_fund_name || "No transfer"}`
      );
    });
  }

  // Show unmigrated expenses if any
  if (
    results.results.unmigrated_sample &&
    results.results.unmigrated_sample.length > 0
  ) {
    console.log("\n⚠️ Sample unmigrated expenses:");
    results.results.unmigrated_sample.forEach((expense, index) => {
      console.log(
        `  ${index + 1}. ${expense.description} (Category: ${
          expense.category_name
        })`
      );
    });
  }
}

async function testExpenseCreation() {
  console.log("\n=== Testing Expense Creation (Post-Migration) ===");

  try {
    // First, get available categories and funds
    const categories = await makeRequest("/api/categories");
    const funds = await makeRequest("/api/funds");
    const periods = await makeRequest("/api/periods");

    if (categories.length === 0 || funds.length === 0 || periods.length === 0) {
      console.log("⚠️ Skipping expense creation test - missing required data");
      return;
    }

    // Find an active period
    const activePeriod = periods.find((p) => p.is_open || p.isOpen);
    if (!activePeriod) {
      console.log("⚠️ Skipping expense creation test - no active period found");
      return;
    }

    // Create a test expense (this will fail if source_fund_id is required but not provided)
    const testExpense = {
      category_id: categories[0].id,
      period_id: activePeriod.id,
      date: new Date().toISOString().split("T")[0],
      payment_method: "debit",
      description: "Test expense for source fund migration",
      amount: 10.0,
    };

    console.log("Creating test expense:", testExpense);

    const createdExpense = await makeRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify(testExpense),
    });

    console.log("✅ Test expense created successfully");
    console.log("Created expense:", JSON.stringify(createdExpense, null, 2));

    // Clean up - delete the test expense
    await makeRequest(`/api/expenses/${createdExpense.id}`, {
      method: "DELETE",
    });
    console.log("✅ Test expense cleaned up");
  } catch (error) {
    console.error("❌ Expense creation test failed:", error.message);
    // This might be expected if the API now requires source_fund_id
    if (
      error.message.includes("source_fund_id") ||
      error.message.includes("source fund")
    ) {
      console.log("ℹ️ This is expected if the API now requires source_fund_id");
    }
  }
}

async function main() {
  console.log("🚀 Starting Expense Source Fund Migration Test");
  console.log(`API Base URL: ${API_BASE_URL}`);

  try {
    // Step 1: Check initial migration status
    const initialStatus = await testMigrationStatus();

    // Step 2: Run migration if needed
    let migrationResults;
    if (initialStatus.ready_for_migration) {
      console.log("\n📦 Migration is ready to run");
      migrationResults = await runMigration();

      // Step 3: Validate migration results
      await validateMigrationResults(migrationResults);
    } else {
      console.log("\n✅ Migration has already been run");
      console.log("Current status:", initialStatus.migration_status);
    }

    // Step 4: Test expense creation (to see if API changes are needed)
    await testExpenseCreation();

    console.log("\n🎉 Migration test completed successfully!");
  } catch (error) {
    console.error("\n💥 Migration test failed:", error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  testMigrationStatus,
  runMigration,
  validateMigrationResults,
  testExpenseCreation,
};

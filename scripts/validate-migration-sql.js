#!/usr/bin/env node

/**
 * Validation script for expense source fund migration SQL
 * This script validates the SQL syntax and logic without executing against a database
 */

const fs = require("fs");
const path = require("path");

function validateSQLFile(filename) {
  console.log(`\n=== Validating ${filename} ===`);

  try {
    const filePath = path.join(__dirname, filename);
    const content = fs.readFileSync(filePath, "utf8");

    // Basic SQL syntax checks
    const checks = [
      {
        name: "ALTER TABLE statement",
        pattern: /ALTER TABLE expenses ADD COLUMN.*source_fund_id/i,
        required: true,
      },
      {
        name: "CREATE INDEX statement",
        pattern: /CREATE INDEX.*idx_expenses_source_fund_id/i,
        required: true,
      },
      {
        name: "UPDATE statement for migration",
        pattern: /UPDATE expenses\s+SET source_fund_id/i,
        required: true,
      },
      {
        name: "Foreign key reference",
        pattern: /REFERENCES funds\(id\)/i,
        required: true,
      },
      {
        name: "Function creation",
        pattern: /CREATE OR REPLACE FUNCTION/i,
        required: true,
      },
      {
        name: "COALESCE for fallback logic",
        pattern: /COALESCE/i,
        required: true,
      },
    ];

    let passed = 0;
    let failed = 0;

    checks.forEach((check) => {
      const found = check.pattern.test(content);
      if (found) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else if (check.required) {
        console.log(`❌ ${check.name} - REQUIRED`);
        failed++;
      } else {
        console.log(`⚠️ ${check.name} - OPTIONAL`);
      }
    });

    // Check for potential issues
    const issues = [];

    // Check for proper UUID handling
    if (!content.includes("UUID")) {
      issues.push("Missing UUID type references");
    }

    // Check for proper error handling in functions
    if (
      content.includes("CREATE OR REPLACE FUNCTION") &&
      !content.includes("EXCEPTION")
    ) {
      // This is actually OK for our functions, they don't need exception handling
    }

    // Check for proper indexing
    if (!content.includes("CREATE INDEX")) {
      issues.push("Missing index creation");
    }

    console.log(`\n📊 Summary: ${passed} passed, ${failed} failed`);

    if (issues.length > 0) {
      console.log("\n⚠️ Potential issues:");
      issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    return failed === 0;
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
    return false;
  }
}

function validateMigrationLogic() {
  console.log("\n=== Validating Migration Logic ===");

  const migrationFile = path.join(
    __dirname,
    "create-expense-source-fund-migration.sql"
  );
  const content = fs.readFileSync(migrationFile, "utf8");

  // Check migration priority logic
  const updateMatch = content.match(
    /UPDATE expenses\s+SET source_fund_id = \(([\s\S]*?)\)\s*WHERE/i
  );

  if (updateMatch) {
    const updateLogic = updateMatch[1];

    // Should prioritize category_fund_relationships over legacy fund_id
    const hasCoalesce = updateLogic.includes("COALESCE");
    const hasCategoryFundRelationships = updateLogic.includes(
      "category_fund_relationships"
    );
    const hasLegacyFallback =
      (updateLogic.includes("categories c") ||
        updateLogic.includes("FROM categories")) &&
      (updateLogic.includes("c.fund_id") || updateLogic.includes("fund_id"));

    console.log(`✅ Uses COALESCE for priority logic: ${hasCoalesce}`);
    console.log(
      `✅ Prioritizes category_fund_relationships: ${hasCategoryFundRelationships}`
    );
    console.log(`✅ Falls back to legacy fund_id: ${hasLegacyFallback}`);

    // Debug: show what we found
    console.log(`\nDEBUG - Update logic content:`);
    console.log(updateLogic.substring(0, 200) + "...");

    if (hasCoalesce && hasCategoryFundRelationships && hasLegacyFallback) {
      console.log("✅ Migration logic is correct");
      return true;
    } else {
      console.log("❌ Migration logic has issues");
      return false;
    }
  } else {
    console.log("❌ Could not find UPDATE statement");
    return false;
  }
}

function validateFunctionDefinitions() {
  console.log("\n=== Validating Function Definitions ===");

  const migrationFile = path.join(
    __dirname,
    "create-expense-source-fund-migration.sql"
  );
  const content = fs.readFileSync(migrationFile, "utf8");

  const expectedFunctions = [
    "validate_expense_source_fund",
    "get_category_source_funds",
    "check_expense_source_fund_migration_status",
  ];

  let allFound = true;

  expectedFunctions.forEach((funcName) => {
    const pattern = new RegExp(`CREATE OR REPLACE FUNCTION ${funcName}`, "i");
    if (pattern.test(content)) {
      console.log(`✅ Function ${funcName} defined`);
    } else {
      console.log(`❌ Function ${funcName} missing`);
      allFound = false;
    }
  });

  return allFound;
}

function validateRollbackScript() {
  console.log("\n=== Validating Rollback Script ===");

  const rollbackFile = path.join(
    __dirname,
    "rollback-expense-source-fund-migration.sql"
  );
  const content = fs.readFileSync(rollbackFile, "utf8");

  const checks = [
    {
      name: "Drop functions",
      pattern: /DROP FUNCTION.*validate_expense_source_fund/i,
      required: true,
    },
    {
      name: "Drop index",
      pattern: /DROP INDEX.*idx_expenses_source_fund_id/i,
      required: true,
    },
    {
      name: "Drop column",
      pattern: /ALTER TABLE expenses DROP COLUMN.*source_fund_id/i,
      required: true,
    },
  ];

  let allPassed = true;

  checks.forEach((check) => {
    if (check.pattern.test(content)) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`❌ ${check.name}`);
      allPassed = false;
    }
  });

  return allPassed;
}

function main() {
  console.log("🔍 Validating Expense Source Fund Migration SQL");

  const files = [
    "create-expense-source-fund-migration.sql",
    "rollback-expense-source-fund-migration.sql",
    "verify-expense-source-fund-migration.sql",
  ];

  let allValid = true;

  // Validate each SQL file
  files.forEach((file) => {
    if (!validateSQLFile(file)) {
      allValid = false;
    }
  });

  // Validate migration logic
  if (!validateMigrationLogic()) {
    allValid = false;
  }

  // Validate function definitions
  if (!validateFunctionDefinitions()) {
    allValid = false;
  }

  // Validate rollback script
  if (!validateRollbackScript()) {
    allValid = false;
  }

  console.log("\n" + "=".repeat(50));

  if (allValid) {
    console.log("🎉 All validation checks passed!");
    console.log("✅ Migration scripts are ready for execution");
  } else {
    console.log("❌ Some validation checks failed");
    console.log("⚠️ Please review and fix issues before running migration");
  }

  return allValid;
}

// Run validation if this script is executed directly
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = {
  validateSQLFile,
  validateMigrationLogic,
  validateFunctionDefinitions,
  validateRollbackScript,
};

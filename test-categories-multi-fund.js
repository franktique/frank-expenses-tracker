// Simple test to verify CategoriesView multi-fund functionality
const { execSync } = require("child_process");

console.log("Testing CategoriesView multi-fund functionality...");

try {
  // Run the specific test file
  const result = execSync(
    'npm test -- --testPathPatterns="categories-view-multi-fund" --verbose',
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("✅ All CategoriesView multi-fund tests passed!");
  console.log("\nTest Results:");
  console.log(result);

  // Also run MultiFundSelector tests
  const multiFundResult = execSync(
    'npm test -- --testPathPatterns="multi-fund-selector" --verbose',
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  );

  console.log("✅ All MultiFundSelector tests passed!");
  console.log("\nMultiFundSelector Test Results:");
  console.log(multiFundResult);
} catch (error) {
  console.error("❌ Tests failed:", error.message);
  process.exit(1);
}

console.log("\n🎉 All multi-fund functionality tests completed successfully!");

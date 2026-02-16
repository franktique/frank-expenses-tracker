/**
 * Manual test script for category-fund relationship endpoints
 * Run this after starting the development server with: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Testing Category-Fund Relationship Endpoints\n');

  try {
    // Test 1: Get categories to find a test category
    console.log('1. Getting existing categories...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
    const categories = await categoriesResponse.json();

    if (!categories || categories.length === 0) {
      console.log('❌ No categories found. Please create a category first.');
      return;
    }

    const testCategory = categories[0];
    console.log(
      `✅ Found test category: ${testCategory.name} (ID: ${testCategory.id})`
    );

    // Test 2: Get funds to find test funds
    console.log('\n2. Getting existing funds...');
    const fundsResponse = await fetch(`${BASE_URL}/api/funds`);
    const funds = await fundsResponse.json();

    if (!funds || funds.length === 0) {
      console.log('❌ No funds found. Please create funds first.');
      return;
    }

    console.log(`✅ Found ${funds.length} funds`);
    const testFunds = funds.slice(0, 2); // Use first 2 funds for testing

    // Test 3: GET category funds (should be empty initially)
    console.log(`\n3. Getting funds for category ${testCategory.id}...`);
    const categoryFundsResponse = await fetch(
      `${BASE_URL}/api/categories/${testCategory.id}/funds`
    );
    const categoryFundsData = await categoryFundsResponse.json();

    if (categoryFundsResponse.ok) {
      console.log(
        `✅ GET /api/categories/${testCategory.id}/funds - Status: ${categoryFundsResponse.status}`
      );
      console.log(
        `   Found ${categoryFundsData.funds.length} associated funds`
      );
    } else {
      console.log(
        `❌ GET failed - Status: ${categoryFundsResponse.status}, Error: ${categoryFundsData.error}`
      );
    }

    // Test 4: POST - Update category-fund relationships
    console.log(`\n4. Updating category-fund relationships...`);
    const updateData = {
      fund_ids: testFunds.map((f) => f.id),
    };

    const updateResponse = await fetch(
      `${BASE_URL}/api/categories/${testCategory.id}/funds`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    const updateResult = await updateResponse.json();

    if (updateResponse.ok) {
      console.log(
        `✅ POST /api/categories/${testCategory.id}/funds - Status: ${updateResponse.status}`
      );
      console.log(
        `   Updated relationships for ${updateResult.funds.length} funds`
      );
    } else {
      console.log(
        `❌ POST failed - Status: ${updateResponse.status}, Error: ${updateResult.error}`
      );
      if (updateResult.details) {
        console.log(`   Details: ${JSON.stringify(updateResult.details)}`);
      }
    }

    // Test 5: GET category funds again (should now have funds)
    console.log(
      `\n5. Getting funds for category ${testCategory.id} after update...`
    );
    const updatedCategoryFundsResponse = await fetch(
      `${BASE_URL}/api/categories/${testCategory.id}/funds`
    );
    const updatedCategoryFundsData = await updatedCategoryFundsResponse.json();

    if (updatedCategoryFundsResponse.ok) {
      console.log(
        `✅ GET /api/categories/${testCategory.id}/funds - Status: ${updatedCategoryFundsResponse.status}`
      );
      console.log(
        `   Found ${updatedCategoryFundsData.funds.length} associated funds`
      );
      updatedCategoryFundsData.funds.forEach((fund) => {
        console.log(`   - ${fund.name} (${fund.id})`);
      });
    } else {
      console.log(
        `❌ GET failed - Status: ${updatedCategoryFundsResponse.status}, Error: ${updatedCategoryFundsData.error}`
      );
    }

    // Test 6: DELETE - Remove one fund relationship
    if (testFunds.length > 0) {
      const fundToRemove = testFunds[0];
      console.log(
        `\n6. Removing relationship with fund ${fundToRemove.name}...`
      );

      const deleteResponse = await fetch(
        `${BASE_URL}/api/categories/${testCategory.id}/funds/${fundToRemove.id}`,
        {
          method: 'DELETE',
        }
      );

      const deleteResult = await deleteResponse.json();

      if (deleteResponse.ok) {
        console.log(
          `✅ DELETE /api/categories/${testCategory.id}/funds/${fundToRemove.id} - Status: ${deleteResponse.status}`
        );
        console.log(`   ${deleteResult.message}`);
        if (deleteResult.warning) {
          console.log(`   ⚠️  Warning: ${deleteResult.warning}`);
        }
      } else {
        console.log(
          `❌ DELETE failed - Status: ${deleteResponse.status}, Error: ${deleteResult.error}`
        );
        if (deleteResult.details) {
          console.log(`   Details: ${JSON.stringify(deleteResult.details)}`);
        }
      }
    }

    // Test 7: Final verification
    console.log(`\n7. Final verification - getting category funds...`);
    const finalCategoryFundsResponse = await fetch(
      `${BASE_URL}/api/categories/${testCategory.id}/funds`
    );
    const finalCategoryFundsData = await finalCategoryFundsResponse.json();

    if (finalCategoryFundsResponse.ok) {
      console.log(
        `✅ Final GET /api/categories/${testCategory.id}/funds - Status: ${finalCategoryFundsResponse.status}`
      );
      console.log(
        `   Found ${finalCategoryFundsData.funds.length} associated funds`
      );
    } else {
      console.log(
        `❌ Final GET failed - Status: ${finalCategoryFundsResponse.status}, Error: ${finalCategoryFundsData.error}`
      );
    }

    console.log('\n🎉 All endpoint tests completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases\n');

  try {
    // Test 1: Non-existent category
    console.log('1. Testing non-existent category...');
    const nonExistentResponse = await fetch(
      `${BASE_URL}/api/categories/00000000-0000-0000-0000-000000000000/funds`
    );
    const nonExistentData = await nonExistentResponse.json();

    if (nonExistentResponse.status === 404) {
      console.log('✅ Non-existent category returns 404 as expected');
    } else {
      console.log(`❌ Expected 404, got ${nonExistentResponse.status}`);
    }

    // Test 2: Invalid fund IDs in POST
    console.log('\n2. Testing invalid fund IDs...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
    const categories = await categoriesResponse.json();

    if (categories && categories.length > 0) {
      const testCategory = categories[0];
      const invalidUpdateResponse = await fetch(
        `${BASE_URL}/api/categories/${testCategory.id}/funds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fund_ids: ['invalid-uuid', '00000000-0000-0000-0000-000000000000'],
          }),
        }
      );

      const invalidUpdateData = await invalidUpdateResponse.json();

      if (invalidUpdateResponse.status === 400) {
        console.log('✅ Invalid fund IDs return 400 as expected');
        console.log(`   Error: ${invalidUpdateData.error}`);
      } else {
        console.log(`❌ Expected 400, got ${invalidUpdateResponse.status}`);
      }
    }

    console.log('\n🎉 Error case tests completed!');
  } catch (error) {
    console.error('❌ Error case test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  await testEndpoints();
  await testErrorCases();
}

// Check if running directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testEndpoints, testErrorCases, runAllTests };

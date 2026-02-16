/**
 * Test script for modified category endpoints with multiple fund support
 * Run this after starting the development server with: npm run dev
 */

const BASE_URL = 'http://localhost:3000';

async function testModifiedEndpoints() {
  console.log(
    '🧪 Testing Modified Category Endpoints with Multiple Fund Support\n'
  );

  try {
    // Test 1: GET /api/categories - should include associated_funds array
    console.log('1. Testing GET /api/categories with associated_funds...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
    const categories = await categoriesResponse.json();

    if (categoriesResponse.ok) {
      console.log(
        `✅ GET /api/categories - Status: ${categoriesResponse.status}`
      );
      console.log(`   Found ${categories.length} categories`);

      if (categories.length > 0) {
        const firstCategory = categories[0];
        console.log(`   First category: ${firstCategory.name}`);
        console.log(
          `   Has associated_funds field: ${
            firstCategory.associated_funds !== undefined
          }`
        );
        console.log(
          `   Associated funds count: ${
            firstCategory.associated_funds?.length || 0
          }`
        );

        if (
          firstCategory.associated_funds &&
          firstCategory.associated_funds.length > 0
        ) {
          console.log(
            `   First associated fund: ${firstCategory.associated_funds[0].name}`
          );
        }
      }
    } else {
      console.log(
        `❌ GET /api/categories failed - Status: ${categoriesResponse.status}`
      );
      return;
    }

    if (categories.length === 0) {
      console.log('❌ No categories found. Please create a category first.');
      return;
    }

    const testCategory = categories[0];

    // Test 2: GET /api/categories/[id] - should include associated_funds array
    console.log(
      `\n2. Testing GET /api/categories/${testCategory.id} with associated_funds...`
    );
    const categoryResponse = await fetch(
      `${BASE_URL}/api/categories/${testCategory.id}`
    );
    const category = await categoryResponse.json();

    if (categoryResponse.ok) {
      console.log(
        `✅ GET /api/categories/${testCategory.id} - Status: ${categoryResponse.status}`
      );
      console.log(`   Category: ${category.name}`);
      console.log(
        `   Has associated_funds field: ${
          category.associated_funds !== undefined
        }`
      );
      console.log(
        `   Associated funds count: ${category.associated_funds?.length || 0}`
      );
      console.log(`   Legacy fund_id: ${category.fund_id || 'null'}`);
      console.log(`   Legacy fund_name: ${category.fund_name || 'null'}`);
    } else {
      console.log(
        `❌ GET /api/categories/${testCategory.id} failed - Status: ${categoryResponse.status}`
      );
    }

    // Test 3: Get available funds for testing
    console.log('\n3. Getting available funds for testing...');
    const fundsResponse = await fetch(`${BASE_URL}/api/funds`);
    const funds = await fundsResponse.json();

    if (!fundsResponse.ok || !funds || funds.length === 0) {
      console.log('❌ No funds found. Please create funds first.');
      return;
    }

    console.log(`✅ Found ${funds.length} funds available for testing`);
    const testFunds = funds.slice(0, Math.min(3, funds.length)); // Use up to 3 funds

    // Test 4: POST /api/categories with fund_ids array
    console.log('\n4. Testing POST /api/categories with fund_ids array...');
    const newCategoryData = {
      name: `Test Category ${Date.now()}`,
      fund_ids: testFunds.slice(0, 2).map((f) => f.id), // Use first 2 funds
    };

    const createResponse = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCategoryData),
    });

    const createdCategory = await createResponse.json();

    if (createResponse.ok) {
      console.log(
        `✅ POST /api/categories with fund_ids - Status: ${createResponse.status}`
      );
      console.log(`   Created category: ${createdCategory.name}`);
      console.log(
        `   Associated funds count: ${
          createdCategory.associated_funds?.length || 0
        }`
      );

      if (createdCategory.associated_funds) {
        createdCategory.associated_funds.forEach((fund, index) => {
          console.log(`   Fund ${index + 1}: ${fund.name} (${fund.id})`);
        });
      }
    } else {
      console.log(
        `❌ POST /api/categories with fund_ids failed - Status: ${createResponse.status}`
      );
      console.log(`   Error: ${createdCategory.error}`);
      return;
    }

    // Test 5: PUT /api/categories/[id] with fund_ids array
    console.log(
      `\n5. Testing PUT /api/categories/${createdCategory.id} with fund_ids array...`
    );
    const updateData = {
      name: `Updated ${createdCategory.name}`,
      fund_ids: [testFunds[0].id, testFunds[2]?.id].filter(Boolean), // Use different funds
    };

    const updateResponse = await fetch(
      `${BASE_URL}/api/categories/${createdCategory.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    const updatedCategory = await updateResponse.json();

    if (updateResponse.ok) {
      console.log(
        `✅ PUT /api/categories/${createdCategory.id} with fund_ids - Status: ${updateResponse.status}`
      );
      console.log(`   Updated category: ${updatedCategory.name}`);
      console.log(
        `   Associated funds count: ${
          updatedCategory.associated_funds?.length || 0
        }`
      );

      if (updatedCategory.associated_funds) {
        updatedCategory.associated_funds.forEach((fund, index) => {
          console.log(`   Fund ${index + 1}: ${fund.name} (${fund.id})`);
        });
      }
    } else {
      console.log(
        `❌ PUT /api/categories/${createdCategory.id} with fund_ids failed - Status: ${updateResponse.status}`
      );
      console.log(`   Error: ${updatedCategory.error}`);
    }

    // Test 6: Backward compatibility - POST with single fund_id
    console.log(
      '\n6. Testing backward compatibility - POST with single fund_id...'
    );
    const backwardCompatData = {
      name: `Backward Compat Category ${Date.now()}`,
      fund_id: testFunds[0].id,
    };

    const backwardCreateResponse = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backwardCompatData),
    });

    const backwardCreatedCategory = await backwardCreateResponse.json();

    if (backwardCreateResponse.ok) {
      console.log(
        `✅ POST /api/categories with fund_id (backward compat) - Status: ${backwardCreateResponse.status}`
      );
      console.log(`   Created category: ${backwardCreatedCategory.name}`);
      console.log(`   Legacy fund_id: ${backwardCreatedCategory.fund_id}`);
      console.log(`   Legacy fund_name: ${backwardCreatedCategory.fund_name}`);
      console.log(
        `   Associated funds count: ${
          backwardCreatedCategory.associated_funds?.length || 0
        }`
      );
    } else {
      console.log(
        `❌ POST /api/categories with fund_id failed - Status: ${backwardCreateResponse.status}`
      );
      console.log(`   Error: ${backwardCreatedCategory.error}`);
    }

    // Test 7: Backward compatibility - PUT with single fund_id
    if (backwardCreatedCategory.id) {
      console.log(
        `\n7. Testing backward compatibility - PUT with single fund_id...`
      );
      const backwardUpdateData = {
        fund_id: testFunds[1]?.id || testFunds[0].id,
      };

      const backwardUpdateResponse = await fetch(
        `${BASE_URL}/api/categories/${backwardCreatedCategory.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(backwardUpdateData),
        }
      );

      const backwardUpdatedCategory = await backwardUpdateResponse.json();

      if (backwardUpdateResponse.ok) {
        console.log(
          `✅ PUT /api/categories/${backwardCreatedCategory.id} with fund_id (backward compat) - Status: ${backwardUpdateResponse.status}`
        );
        console.log(`   Legacy fund_id: ${backwardUpdatedCategory.fund_id}`);
        console.log(
          `   Legacy fund_name: ${backwardUpdatedCategory.fund_name}`
        );
        console.log(
          `   Associated funds count: ${
            backwardUpdatedCategory.associated_funds?.length || 0
          }`
        );
      } else {
        console.log(
          `❌ PUT /api/categories/${backwardCreatedCategory.id} with fund_id failed - Status: ${backwardUpdateResponse.status}`
        );
        console.log(`   Error: ${backwardUpdatedCategory.error}`);
      }
    }

    console.log('\n🎉 All modified endpoint tests completed!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Test error cases for modified endpoints
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases for Modified Endpoints\n');

  try {
    // Test 1: POST with invalid fund_ids
    console.log('1. Testing POST with invalid fund_ids...');
    const invalidCreateData = {
      name: `Invalid Test Category ${Date.now()}`,
      fund_ids: ['invalid-uuid', '00000000-0000-0000-0000-000000000000'],
    };

    const invalidCreateResponse = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidCreateData),
    });

    const invalidCreateResult = await invalidCreateResponse.json();

    if (invalidCreateResponse.status === 400) {
      console.log('✅ POST with invalid fund_ids returns 400 as expected');
      console.log(`   Error: ${invalidCreateResult.error}`);
    } else {
      console.log(`❌ Expected 400, got ${invalidCreateResponse.status}`);
    }

    // Test 2: PUT with invalid fund_ids
    console.log('\n2. Testing PUT with invalid fund_ids...');
    const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
    const categories = await categoriesResponse.json();

    if (categories && categories.length > 0) {
      const testCategory = categories[0];
      const invalidUpdateData = {
        fund_ids: ['invalid-uuid'],
      };

      const invalidUpdateResponse = await fetch(
        `${BASE_URL}/api/categories/${testCategory.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invalidUpdateData),
        }
      );

      const invalidUpdateResult = await invalidUpdateResponse.json();

      if (invalidUpdateResponse.status === 400) {
        console.log('✅ PUT with invalid fund_ids returns 400 as expected');
        console.log(`   Error: ${invalidUpdateResult.error}`);
      } else {
        console.log(`❌ Expected 400, got ${invalidUpdateResponse.status}`);
      }
    }

    console.log('\n🎉 Error case tests completed!');
  } catch (error) {
    console.error('❌ Error case test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testModifiedEndpoints();
  await testErrorCases();
}

// Check if running directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testModifiedEndpoints, testErrorCases, runAllTests };

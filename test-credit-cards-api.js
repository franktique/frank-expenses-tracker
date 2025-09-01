// Simple test script to verify credit cards API endpoints
const BASE_URL = "http://localhost:3000";

async function testCreditCardsAPI() {
  console.log("🧪 Testing Credit Cards API Endpoints...\n");

  try {
    // Test 1: GET /api/credit-cards (list all)
    console.log("1. Testing GET /api/credit-cards");
    const listResponse = await fetch(`${BASE_URL}/api/credit-cards`);
    const listData = await listResponse.json();
    console.log("✅ Status:", listResponse.status);
    console.log("📄 Response:", JSON.stringify(listData, null, 2));
    console.log("");

    // Test 2: POST /api/credit-cards (create new)
    console.log("2. Testing POST /api/credit-cards");
    const createPayload = {
      bank_name: "Banco de Prueba",
      franchise: "visa",
      last_four_digits: "1234",
    };

    const createResponse = await fetch(`${BASE_URL}/api/credit-cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createPayload),
    });

    const createData = await createResponse.json();
    console.log("✅ Status:", createResponse.status);
    console.log("📄 Response:", JSON.stringify(createData, null, 2));

    const createdCardId = createData.credit_card?.id;
    console.log("");

    if (createdCardId) {
      // Test 3: GET /api/credit-cards/[id] (get specific)
      console.log("3. Testing GET /api/credit-cards/[id]");
      const getResponse = await fetch(
        `${BASE_URL}/api/credit-cards/${createdCardId}`
      );
      const getData = await getResponse.json();
      console.log("✅ Status:", getResponse.status);
      console.log("📄 Response:", JSON.stringify(getData, null, 2));
      console.log("");

      // Test 4: PUT /api/credit-cards/[id] (update)
      console.log("4. Testing PUT /api/credit-cards/[id]");
      const updatePayload = {
        bank_name: "Banco Actualizado",
        last_four_digits: "5678",
      };

      const updateResponse = await fetch(
        `${BASE_URL}/api/credit-cards/${createdCardId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      const updateData = await updateResponse.json();
      console.log("✅ Status:", updateResponse.status);
      console.log("📄 Response:", JSON.stringify(updateData, null, 2));
      console.log("");

      // Test 5: DELETE /api/credit-cards/[id] (delete)
      console.log("5. Testing DELETE /api/credit-cards/[id]");
      const deleteResponse = await fetch(
        `${BASE_URL}/api/credit-cards/${createdCardId}`,
        {
          method: "DELETE",
        }
      );

      const deleteData = await deleteResponse.json();
      console.log("✅ Status:", deleteResponse.status);
      console.log("📄 Response:", JSON.stringify(deleteData, null, 2));
      console.log("");
    }

    // Test 6: Validation errors
    console.log("6. Testing validation errors");
    const invalidPayload = {
      bank_name: "", // Invalid: empty
      franchise: "invalid_franchise", // Invalid: not in enum
      last_four_digits: "12345", // Invalid: 5 digits instead of 4
    };

    const validationResponse = await fetch(`${BASE_URL}/api/credit-cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidPayload),
    });

    const validationData = await validationResponse.json();
    console.log("✅ Status:", validationResponse.status);
    console.log("📄 Response:", JSON.stringify(validationData, null, 2));
    console.log("");

    console.log("🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the tests
testCreditCardsAPI();

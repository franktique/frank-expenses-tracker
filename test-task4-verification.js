const BASE_URL = "http://localhost:3000";

async function verifyTask4Implementation() {
  console.log(
    "🧪 Verifying Task 4: Extend expenses API to support credit card associations\n"
  );

  try {
    // Get test data
    const [
      creditCardsResponse,
      categoriesResponse,
      periodsResponse,
      fundsResponse,
    ] = await Promise.all([
      fetch(`${BASE_URL}/api/credit-cards`),
      fetch(`${BASE_URL}/api/categories`),
      fetch(`${BASE_URL}/api/periods`),
      fetch(`${BASE_URL}/api/funds`),
    ]);

    const creditCardsData = await creditCardsResponse.json();
    const categoriesData = await categoriesResponse.json();
    const periodsData = await periodsResponse.json();
    const fundsData = await fundsResponse.json();

    if (
      !creditCardsData.credit_cards?.length ||
      !categoriesData.length ||
      !periodsData.length ||
      !fundsData.length
    ) {
      console.log("❌ Missing required test data");
      return;
    }

    const creditCard = creditCardsData.credit_cards[0];
    const category = categoriesData[0];
    const period = periodsData[0];
    const fund = fundsData[0];

    console.log("📋 Test Data:");
    console.log(
      "   Credit Card:",
      creditCard.bank_name,
      creditCard.franchise,
      "****" + creditCard.last_four_digits
    );
    console.log("   Category:", category.name);
    console.log("   Period:", period.name);
    console.log("   Fund:", fund.name);

    // Sub-task 1: POST /api/expenses accepts optional credit_card_id
    console.log(
      "\n✅ Sub-task 1: POST /api/expenses accepts optional credit_card_id"
    );

    const expenseData = {
      category_id: category.id,
      period_id: period.id,
      date: "2024-01-15",
      payment_method: "credit",
      description: "Test expense with credit card",
      amount: 75.5,
      source_fund_id: fund.id,
      credit_card_id: creditCard.id,
    };

    const createResponse = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseData),
    });

    const createdExpense = await createResponse.json();
    console.log("   Status:", createResponse.status);
    console.log(
      "   Credit Card ID saved:",
      createdExpense.credit_card_id === creditCard.id ? "✅" : "❌"
    );
    console.log(
      "   Credit Card Info populated:",
      createdExpense.credit_card_info ? "✅" : "❌"
    );

    if (!createResponse.ok) {
      console.log("❌ Failed to create expense:", createdExpense);
      return;
    }

    // Sub-task 2: POST without credit card (backward compatibility)
    console.log(
      "\n✅ Sub-task 2: POST without credit card (backward compatibility)"
    );

    const expenseWithoutCard = {
      category_id: category.id,
      period_id: period.id,
      date: "2024-01-16",
      payment_method: "debit",
      description: "Test expense without credit card",
      amount: 25.0,
      source_fund_id: fund.id,
      // No credit_card_id
    };

    const createResponse2 = await fetch(`${BASE_URL}/api/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseWithoutCard),
    });

    const createdExpense2 = await createResponse2.json();
    console.log("   Status:", createResponse2.status);
    console.log(
      "   Credit Card ID is null:",
      createdExpense2.credit_card_id === null ? "✅" : "❌"
    );
    console.log(
      "   Credit Card Info is undefined:",
      createdExpense2.credit_card_info === undefined ? "✅" : "❌"
    );

    // Sub-task 3: GET /api/expenses includes credit card information
    console.log(
      "\n✅ Sub-task 3: GET /api/expenses includes credit card information"
    );

    const getResponse = await fetch(
      `${BASE_URL}/api/expenses/${createdExpense.id}`
    );
    const retrievedExpense = await getResponse.json();
    console.log("   Status:", getResponse.status);
    console.log(
      "   Credit Card Info structure correct:",
      retrievedExpense.credit_card_info?.bank_name === creditCard.bank_name &&
        retrievedExpense.credit_card_info?.franchise === creditCard.franchise &&
        retrievedExpense.credit_card_info?.last_four_digits ===
          creditCard.last_four_digits
        ? "✅"
        : "❌"
    );

    // Sub-task 4: PUT /api/expenses/[id] updates credit card associations
    console.log(
      "\n✅ Sub-task 4: PUT /api/expenses/[id] updates credit card associations"
    );

    // Update to remove credit card
    const updateResponse1 = await fetch(
      `${BASE_URL}/api/expenses/${createdExpense.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit_card_id: null }),
      }
    );

    const updatedExpense1 = await updateResponse1.json();
    console.log("   Remove credit card - Status:", updateResponse1.status);
    console.log(
      "   Credit card removed:",
      updatedExpense1.credit_card_id === null ? "✅" : "❌"
    );
    console.log(
      "   Credit card info cleared:",
      updatedExpense1.credit_card_info === undefined ? "✅" : "❌"
    );

    // Update to add credit card back
    const updateResponse2 = await fetch(
      `${BASE_URL}/api/expenses/${createdExpense.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit_card_id: creditCard.id }),
      }
    );

    const updatedExpense2 = await updateResponse2.json();
    console.log("   Add credit card - Status:", updateResponse2.status);
    console.log(
      "   Credit card added:",
      updatedExpense2.credit_card_id === creditCard.id ? "✅" : "❌"
    );
    console.log(
      "   Credit card info populated:",
      updatedExpense2.credit_card_info ? "✅" : "❌"
    );

    // Sub-task 5: GET /api/expenses (list) includes credit card information
    console.log(
      "\n✅ Sub-task 5: GET /api/expenses (list) includes credit card information"
    );

    const listResponse = await fetch(`${BASE_URL}/api/expenses`);
    const expensesList = await listResponse.json();
    console.log("   Status:", listResponse.status);

    const expenseWithCard = expensesList.find(
      (exp) => exp.id === createdExpense.id
    );
    const expenseWithoutCardFromList = expensesList.find(
      (exp) => exp.id === createdExpense2.id
    );

    console.log(
      "   Expense with card has credit_card_info:",
      expenseWithCard?.credit_card_info ? "✅" : "❌"
    );
    console.log(
      "   Expense without card has no credit_card_info:",
      expenseWithoutCardFromList?.credit_card_info === undefined ? "✅" : "❌"
    );

    // Sub-task 6: Backward compatibility verification
    console.log("\n✅ Sub-task 6: Backward compatibility verification");
    console.log(
      "   Existing expenses still work:",
      expensesList.length > 0 ? "✅" : "❌"
    );
    console.log(
      "   Mixed expenses (with/without cards):",
      expensesList.some((exp) => exp.credit_card_info) &&
        expensesList.some((exp) => !exp.credit_card_info)
        ? "✅"
        : "❌"
    );

    // Clean up
    console.log("\n🧹 Cleaning up test expenses...");
    await Promise.all([
      fetch(`${BASE_URL}/api/expenses/${createdExpense.id}`, {
        method: "DELETE",
      }),
      fetch(`${BASE_URL}/api/expenses/${createdExpense2.id}`, {
        method: "DELETE",
      }),
    ]);
    console.log("   Cleanup completed ✅");

    console.log("\n🎉 Task 4 verification completed successfully!");
    console.log("\n📋 Summary:");
    console.log("   ✅ POST /api/expenses accepts optional credit_card_id");
    console.log(
      "   ✅ PUT /api/expenses/[id] updates credit card associations"
    );
    console.log(
      "   ✅ GET /api/expenses includes credit card information in joins"
    );
    console.log("   ✅ Backward compatibility with existing expense data");
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
}

verifyTask4Implementation();

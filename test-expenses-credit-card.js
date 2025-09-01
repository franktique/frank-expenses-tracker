const BASE_URL = "http://localhost:3000";

async function testExpensesWithCreditCard() {
  console.log("🧪 Testing Expenses API with Credit Card Support...\n");

  try {
    // First, get available credit cards
    console.log("1. Getting available credit cards");
    const creditCardsResponse = await fetch(`${BASE_URL}/api/credit-cards`);
    const creditCardsData = await creditCardsResponse.json();
    console.log("✅ Status:", creditCardsResponse.status);

    if (
      creditCardsData.credit_cards &&
      creditCardsData.credit_cards.length > 0
    ) {
      const creditCard = creditCardsData.credit_cards[0];
      console.log(
        "📄 Using credit card:",
        creditCard.id,
        "-",
        creditCard.bank_name,
        creditCard.franchise,
        "****" + creditCard.last_four_digits
      );

      // Get categories and periods for expense creation
      console.log("\n2. Getting categories and periods");
      const categoriesResponse = await fetch(`${BASE_URL}/api/categories`);
      const categoriesData = await categoriesResponse.json();

      const periodsResponse = await fetch(`${BASE_URL}/api/periods`);
      const periodsData = await periodsResponse.json();

      const fundsResponse = await fetch(`${BASE_URL}/api/funds`);
      const fundsData = await fundsResponse.json();

      if (
        categoriesData.length > 0 &&
        periodsData.length > 0 &&
        fundsData.length > 0
      ) {
        const category = categoriesData[0];
        const period = periodsData[0];
        const fund = fundsData[0];

        console.log("✅ Using category:", category.name);
        console.log("✅ Using period:", period.name);
        console.log("✅ Using fund:", fund.name);

        // Test creating expense with credit card
        console.log("\n3. Creating expense with credit card");
        const expenseData = {
          category_id: category.id,
          period_id: period.id,
          date: "2024-01-15",
          payment_method: "credit",
          description: "Test expense with credit card",
          amount: 50.0,
          source_fund_id: fund.id,
          credit_card_id: creditCard.id,
        };

        const createResponse = await fetch(`${BASE_URL}/api/expenses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(expenseData),
        });

        const createData = await createResponse.json();
        console.log("✅ Status:", createResponse.status);

        if (createResponse.ok) {
          console.log("📄 Created expense with credit card info:");
          console.log("   - ID:", createData.id);
          console.log("   - Credit Card ID:", createData.credit_card_id);
          console.log("   - Credit Card Info:", createData.credit_card_info);

          // Test getting the expense
          console.log("\n4. Getting expense with credit card info");
          const getResponse = await fetch(
            `${BASE_URL}/api/expenses/${createData.id}`
          );
          const getData = await getResponse.json();
          console.log("✅ Status:", getResponse.status);
          console.log(
            "📄 Retrieved expense credit card info:",
            getData.credit_card_info
          );

          // Test updating expense credit card
          console.log("\n5. Updating expense credit card (set to null)");
          const updateResponse = await fetch(
            `${BASE_URL}/api/expenses/${createData.id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                credit_card_id: null,
              }),
            }
          );

          const updateData = await updateResponse.json();
          console.log("✅ Status:", updateResponse.status);
          console.log(
            "📄 Updated expense credit card info:",
            updateData.credit_card_info
          );

          // Test getting all expenses with credit card filter
          console.log("\n6. Getting all expenses to check credit card info");
          const allExpensesResponse = await fetch(`${BASE_URL}/api/expenses`);
          const allExpensesData = await allExpensesResponse.json();
          console.log("✅ Status:", allExpensesResponse.status);

          const expensesWithCreditCards = allExpensesData.filter(
            (exp) => exp.credit_card_info
          );
          console.log(
            "📄 Found",
            expensesWithCreditCards.length,
            "expenses with credit cards"
          );

          if (expensesWithCreditCards.length > 0) {
            console.log(
              "   Example:",
              expensesWithCreditCards[0].credit_card_info
            );
          }

          // Clean up - delete the test expense
          console.log("\n7. Cleaning up test expense");
          const deleteResponse = await fetch(
            `${BASE_URL}/api/expenses/${createData.id}`,
            {
              method: "DELETE",
            }
          );
          console.log("✅ Cleanup status:", deleteResponse.status);
        } else {
          console.log("❌ Failed to create expense:", createData);
        }
      } else {
        console.log("❌ Missing required data (categories, periods, or funds)");
      }
    } else {
      console.log("❌ No credit cards available for testing");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🎉 Credit card expenses test completed!");
}

testExpensesWithCreditCard();

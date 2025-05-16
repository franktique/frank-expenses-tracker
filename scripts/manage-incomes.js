#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to execute curl commands and parse the response
function executeCurl(url, method = 'GET', data = null) {
  let command = `curl -s -X ${method} http://localhost:3000${url}`;
  
  if (data) {
    command += ` -H "Content-Type: application/json" -d '${JSON.stringify(data)}'`;
  }
  
  try {
    const response = execSync(command).toString();
    return JSON.parse(response);
  } catch (error) {
    console.error(`Error executing request: ${error.message}`);
    return null;
  }
}

// Function to list all incomes
async function listIncomes() {
  console.log('\nFetching income records...');
  const incomes = executeCurl('/api/incomes');
  
  if (!incomes || incomes.length === 0) {
    console.log('No income records found.');
    return [];
  }
  
  console.log('\n===== INCOME RECORDS =====');
  console.log('ID | Date | Description | Amount | Period ID');
  console.log('-'.repeat(70));
  
  incomes.forEach((income, index) => {
    console.log(`${index + 1}. ${income.id} | ${income.date} | ${income.description} | $${income.amount} | ${income.period_id || 'N/A'}`);
  });
  
  return incomes;
}

// Function to delete an income
async function deleteIncome(incomeId) {
  console.log(`\nDeleting income with ID: ${incomeId}`);
  const result = executeCurl(`/api/incomes/${incomeId}`, 'DELETE');
  
  if (result && result.success) {
    console.log('Income deleted successfully!');
    return true;
  } else {
    console.error('Failed to delete income:', result ? result.error : 'Unknown error');
    return false;
  }
}

// Main function
async function main() {
  console.log('===== INCOME MANAGEMENT TOOL =====');
  
  try {
    while (true) {
      console.log('\nOptions:');
      console.log('1. List all income records');
      console.log('2. Delete an income record');
      console.log('3. Exit');
      
      const answer = await new Promise(resolve => {
        rl.question('\nSelect an option (1-3): ', resolve);
      });
      
      switch (answer) {
        case '1':
          await listIncomes();
          break;
          
        case '2':
          const incomes = await listIncomes();
          
          if (incomes.length > 0) {
            const indexAnswer = await new Promise(resolve => {
              rl.question('\nEnter the index number of the income to delete (or 0 to cancel): ', resolve);
            });
            
            const index = parseInt(indexAnswer) - 1;
            if (index >= 0 && index < incomes.length) {
              const confirmed = await new Promise(resolve => {
                rl.question(`Are you sure you want to delete income "${incomes[index].description}" with amount $${incomes[index].amount}? (y/n): `, answer => {
                  resolve(answer.toLowerCase() === 'y');
                });
              });
              
              if (confirmed) {
                await deleteIncome(incomes[index].id);
              } else {
                console.log('Deletion cancelled.');
              }
            } else if (index !== -1) {
              console.log('Invalid index selected.');
            }
          }
          break;
          
        case '3':
          console.log('Exiting...');
          rl.close();
          return;
          
        default:
          console.log('Invalid option. Please try again.');
      }
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    rl.close();
  }
}

// Start the program
main();

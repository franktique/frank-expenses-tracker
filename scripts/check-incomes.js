#!/usr/bin/env node

const { execSync } = require('child_process');

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

// Main function
async function main() {
  try {
    console.log('===== VERIFICACIÓN DE INGRESOS =====');
    
    // Obtener todos los periodos
    console.log('\nObteniendo periodos...');
    const periods = executeCurl('/api/periods');
    
    if (!periods || periods.length === 0) {
      console.log('No se encontraron periodos.');
    } else {
      console.log(`Se encontraron ${periods.length} periodos.`);
      const periodIds = new Set(periods.map(p => p.id));
      
      // Obtener todos los ingresos
      console.log('\nObteniendo ingresos...');
      const incomes = executeCurl('/api/incomes');
      
      if (!incomes || incomes.length === 0) {
        console.log('No se encontraron ingresos.');
      } else {
        console.log(`Se encontraron ${incomes.length} ingresos en total.`);
        
        // Agrupar los ingresos
        let incomesWithPeriod = 0;
        let incomesWithoutPeriod = 0;
        let incomesWithInvalidPeriod = 0;
        let totalAmount = 0;
        
        console.log('\n===== RESUMEN DE INGRESOS =====');
        console.log('ID | Fecha | Descripción | Monto | ID Periodo | Estado');
        console.log('-'.repeat(90));
        
        incomes.forEach((income) => {
          totalAmount += parseFloat(income.amount);
          
          let status = '';
          if (!income.period_id) {
            incomesWithoutPeriod++;
            status = 'SIN PERIODO';
          } else if (!periodIds.has(income.period_id)) {
            incomesWithInvalidPeriod++;
            status = 'PERIODO INVÁLIDO';
          } else {
            incomesWithPeriod++;
            status = 'OK';
          }
          
          console.log(`${income.id} | ${income.date} | ${income.description} | $${income.amount} | ${income.period_id || 'N/A'} | ${status}`);
        });
        
        console.log('\n===== ESTADÍSTICAS =====');
        console.log(`Total de ingresos: ${incomes.length}`);
        console.log(`Ingresos con periodo válido: ${incomesWithPeriod}`);
        console.log(`Ingresos sin periodo: ${incomesWithoutPeriod}`);
        console.log(`Ingresos con periodo inválido: ${incomesWithInvalidPeriod}`);
        console.log(`Monto total: $${totalAmount.toFixed(2)}`);
      }
    }
  } catch (error) {
    console.error('Ocurrió un error:', error.message);
  }
}

// Iniciar el programa
main();

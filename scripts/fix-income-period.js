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

// Function to update income with a period
async function updateIncomeWithPeriod(incomeId, periodId) {
  console.log(`\nActualizando ingreso con ID: ${incomeId} para asignar periodo: ${periodId}`);
  
  const response = executeCurl(`/api/incomes/${incomeId}`, 'PUT', {
    period_id: periodId
  });
  
  if (response && !response.error) {
    console.log('¡Ingreso actualizado correctamente!');
    return true;
  } else {
    console.error('Error al actualizar el ingreso:', response ? response.error : 'Error desconocido');
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('===== CORREGIR INGRESOS SIN PERIODO =====');
    
    // Obtener todos los periodos
    console.log('\nObteniendo periodos...');
    const periods = executeCurl('/api/periods');
    
    if (!periods || periods.length === 0) {
      console.log('No se encontraron periodos. Cree un periodo primero.');
      rl.close();
      return;
    }
    
    // Encontrar el periodo activo
    const activePeriod = periods.find(p => p.is_open);
    if (activePeriod) {
      console.log(`Periodo activo encontrado: ${activePeriod.name}`);
    } else {
      console.log('No se encontró un periodo activo. Usando el periodo más reciente como predeterminado.');
    }
    
    // Ordenar periodos por fecha (más reciente primero)
    const sortedPeriods = [...periods].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // Mostrar lista de periodos
    console.log('\n===== PERIODOS DISPONIBLES =====');
    sortedPeriods.forEach((period, index) => {
      console.log(`${index + 1}. ${period.name} (${period.is_open ? 'ACTIVO' : 'CERRADO'})`);
    });
    
    // Obtener todos los ingresos sin periodo
    console.log('\nBuscando ingresos sin periodo asignado...');
    const incomes = executeCurl('/api/incomes');
    
    if (!incomes || incomes.length === 0) {
      console.log('No se encontraron ingresos.');
      rl.close();
      return;
    }
    
    const incomesWithoutPeriod = incomes.filter(income => !income.period_id);
    
    if (incomesWithoutPeriod.length === 0) {
      console.log('No se encontraron ingresos sin periodo asignado.');
      rl.close();
      return;
    }
    
    console.log(`\nSe encontraron ${incomesWithoutPeriod.length} ingresos sin periodo asignado:`);
    incomesWithoutPeriod.forEach((income, index) => {
      console.log(`${index + 1}. Fecha: ${income.date}, Descripción: ${income.description}, Monto: $${income.amount}`);
    });
    
    // Preguntar qué periodo usar
    const defaultPeriodIndex = activePeriod ? sortedPeriods.findIndex(p => p.id === activePeriod.id) : 0;
    const periodAnswer = await new Promise(resolve => {
      rl.question(`\nSeleccione el número del periodo al que desea asignar estos ingresos [${defaultPeriodIndex + 1}]: `, answer => {
        if (!answer.trim()) {
          resolve(defaultPeriodIndex);
        } else {
          resolve(parseInt(answer) - 1);
        }
      });
    });
    
    if (periodAnswer < 0 || periodAnswer >= sortedPeriods.length) {
      console.log('Selección de periodo inválida.');
      rl.close();
      return;
    }
    
    const selectedPeriod = sortedPeriods[periodAnswer];
    console.log(`\nSeleccionó: ${selectedPeriod.name}`);
    
    // Confirmar la actualización
    const confirmation = await new Promise(resolve => {
      rl.question(`¿Está seguro de que desea asignar ${incomesWithoutPeriod.length} ingreso(s) al periodo "${selectedPeriod.name}"? (s/n): `, answer => {
        resolve(answer.toLowerCase() === 's');
      });
    });
    
    if (!confirmation) {
      console.log('Operación cancelada.');
      rl.close();
      return;
    }
    
    // Actualizar cada ingreso
    let successCount = 0;
    let errorCount = 0;
    
    for (const income of incomesWithoutPeriod) {
      const success = await updateIncomeWithPeriod(income.id, selectedPeriod.id);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    console.log(`\n===== RESUMEN =====`);
    console.log(`Ingresos actualizados correctamente: ${successCount}`);
    if (errorCount > 0) {
      console.log(`Ingresos con errores: ${errorCount}`);
    }
    
  } catch (error) {
    console.error('Ocurrió un error:', error.message);
  } finally {
    rl.close();
  }
}

// Iniciar el programa
main();

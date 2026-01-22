# Plan: Simulador de Rendimiento Financiero (Investment Simulator)

## Resumen

Crear un simulador de rendimientos financieros que permita proyectar el crecimiento de inversiones con interés compuesto. El usuario podrá configurar monto inicial, aportes mensuales, plazo, tasa EA (Efectivo Anual) y frecuencia de capitalización (diaria o mensual). Incluirá funcionalidad para comparar múltiples tasas y guardar/listar simulaciones.

## Características Principales

### Parámetros de Entrada
- **Monto inicial**: Capital con el que se inicia la inversión
- **Aporte mensual**: Cantidad fija a depositar cada mes
- **Plazo en meses**: Duración de la inversión
- **Tasa EA (%)**: Tasa Efectivo Anual configurable (a diferencia de la imagen de referencia)
- **Frecuencia de capitalización**: Diaria o Mensual (para cálculo de interés compuesto)

### Vista de Resumen
Similar a la imagen de referencia:
- Monto final proyectado (destacado)
- Total depositado (monto inicial + aportes)
- Rendimientos generados (intereses ganados)
- Tasa EA utilizada

### Vista de Detalle (Tabs)
- **Resumen**: Tarjetas KPI con el resumen de la inversión
- **Detalle por Periodo**: Tabla con desglose mes a mes (o día a día según configuración)
  - Fecha/Periodo
  - Saldo inicial del periodo
  - Aporte del periodo
  - Intereses generados
  - Saldo final del periodo
- **Comparar Tasas**: Agregar múltiples tasas EA para ver cómo afectaría el rendimiento final

### Gestión de Simulaciones
- Crear nuevas simulaciones con nombre único
- Listar todas las simulaciones guardadas
- Editar simulaciones existentes
- Eliminar simulaciones
- Comparar múltiples simulaciones en la lista

---

## Plan de Implementación

### Fase 1: Base de Datos y Tipos
- [x] 1.1 Crear tipos TypeScript para el simulador de inversiones (`/types/invest-simulator.ts`)
  - `InvestmentScenario`: id, name, initialAmount, monthlyContribution, termMonths, annualRate, compoundingFrequency, currency, createdAt, updatedAt
  - `InvestmentProjection`: Proyección calculada con todos los datos del resumen
  - `InvestmentPeriodDetail`: Detalle de cada periodo (mes/día)
  - `RateComparison`: Para comparación de tasas
  - Schemas Zod para validación

- [x] 1.2 Crear endpoint de migración de base de datos (`/app/api/migrate-invest-simulator/route.ts`)
  - Tabla `investment_scenarios` con todos los campos necesarios
  - Tabla `investment_rate_comparisons` para tasas adicionales a comparar
  - Script idempotente (verificar si tablas existen antes de crear)

### Fase 2: Lógica de Cálculos
- [x] 2.1 Crear librería de cálculos financieros (`/lib/invest-calculations.ts`)
  - `convertEAToPeriodicRate(eaRate, frequency)`: Convertir tasa EA a tasa periódica (diaria/mensual)
  - `calculateCompoundInterest(principal, rate, periods, contribution, frequency)`: Cálculo de interés compuesto
  - `generateProjectionSchedule(scenario)`: Generar tabla detallada periodo por periodo
  - `calculateSummary(scenario)`: Calcular resumen con totales
  - `compareRates(scenario, additionalRates)`: Comparar múltiples tasas

### Fase 3: API Endpoints
- [x] 3.1 CRUD de escenarios de inversión (`/app/api/invest-scenarios/route.ts`)
  - `GET`: Listar todos los escenarios
  - `POST`: Crear nuevo escenario

- [x] 3.2 Operaciones por escenario (`/app/api/invest-scenarios/[id]/route.ts`)
  - `GET`: Obtener escenario por ID
  - `PUT`: Actualizar escenario
  - `DELETE`: Eliminar escenario

- [x] 3.3 Proyección y cálculos (`/app/api/invest-scenarios/[id]/projection/route.ts`)
  - `GET`: Obtener proyección completa con detalle de periodos

- [x] 3.4 Comparación de tasas (`/app/api/invest-scenarios/[id]/rate-comparisons/route.ts`)
  - `GET`: Listar tasas de comparación
  - `POST`: Agregar nueva tasa para comparar
  - `DELETE`: Eliminar tasa de comparación

### Fase 4: Componentes UI
- [x] 4.1 Calculadora principal (`/components/invest-simulator/invest-calculator.tsx`)
  - Componente principal que integra formulario + resultados
  - Cálculos en tiempo real (client-side) mientras el usuario ajusta parámetros
  - Botón "Guardar Simulación" para persistir cuando esté satisfecho
  - Puede recibir datos iniciales para cargar una simulación existente

- [x] 4.2 Formulario de entrada (`/components/invest-simulator/invest-calculator-form.tsx`)
  - Campos para monto inicial, aporte mensual, plazo, tasa EA
  - Selector de frecuencia de capitalización (Diaria/Mensual)
  - Selector de moneda
  - Validación en tiempo real
  - Controles +/- para ajustar valores fácilmente

- [x] 4.3 Tarjetas de resumen (`/components/invest-simulator/invest-summary-cards.tsx`)
  - Card destacada con monto final proyectado
  - Cards para: total depositado, rendimientos, tasa EA efectiva
  - Formato de moneda apropiado
  - Actualización en tiempo real

- [x] 4.4 Gráfico de proyección (`/components/invest-simulator/invest-projection-chart.tsx`)
  - Gráfico de área mostrando crecimiento del capital
  - Líneas separadas para: capital aportado vs rendimientos acumulados
  - Tooltips con información detallada

- [x] 4.5 Tabla de detalle por periodo (`/components/invest-simulator/investment-schedule-table.tsx`)
  - Tabla con columnas: Periodo, Saldo Inicial, Aporte, Intereses, Saldo Final
  - Paginación o scroll virtual para muchos periodos
  - Toggle para ver resumen mensual vs detalle diario

- [x] 4.6 Comparador de tasas (`/components/invest-simulator/rate-comparison-panel.tsx`)
  - Input para agregar nuevas tasas a comparar
  - Tabla comparativa mostrando rendimiento final por tasa
  - Diferencia vs tasa base
  - Funciona en tiempo real sin necesidad de guardar

- [x] 4.7 Lista de simulaciones guardadas (`/components/invest-simulator/invest-scenario-list.tsx`)
  - Tabla con todas las simulaciones guardadas
  - Columnas: Nombre, Monto Inicial, Aporte Mensual, Plazo, Tasa, Monto Final
  - Acciones: Cargar, Eliminar
  - Botón para cargar simulación en la calculadora

- [x] 4.8 Diálogo para guardar simulación (`/components/invest-simulator/save-scenario-dialog.tsx`)
  - Modal para ingresar nombre de la simulación
  - Validación de nombre único
  - Confirmar guardado

### Fase 5: Páginas y Rutas
- [x] 5.1 Página principal del simulador (`/app/simular-inversiones/page.tsx`)
  - Calculadora interactiva como elemento principal
  - Cálculos en tiempo real mientras se ajustan parámetros
  - Botón "Guardar" para persistir la simulación actual
  - Sección colapsable con lista de simulaciones guardadas
  - Tabs: Resumen | Detalle por Periodo | Comparar Tasas

- [x] 5.2 Página de simulación guardada (`/app/simular-inversiones/[id]/page.tsx`)
  - Carga los datos de la simulación guardada en la calculadora
  - Permite editar y re-guardar (actualizar)
  - Mismo layout que página principal pero con datos cargados

### Fase 6: Navegación e Integración
- [x] 6.1 Agregar entrada en el menú lateral de navegación
  - Icono apropiado (TrendingUp o similar)
  - Submenú si es necesario
  - Responsive para móvil

- [ ] 6.2 Tests unitarios para cálculos financieros
  - Test de conversión de tasa EA a periódica
  - Test de cálculo de interés compuesto
  - Test de generación de proyección

- [x] 6.3 Actualizar CLAUDE.md con documentación de la nueva funcionalidad

---

## Modelo de Datos

### Tabla: `investment_scenarios`
```sql
CREATE TABLE investment_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  initial_amount DECIMAL(15, 2) NOT NULL,
  monthly_contribution DECIMAL(15, 2) NOT NULL DEFAULT 0,
  term_months INTEGER NOT NULL,
  annual_rate DECIMAL(6, 4) NOT NULL,  -- Tasa EA como decimal (ej: 0.0825 para 8.25%)
  compounding_frequency VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (compounding_frequency IN ('daily', 'monthly')),
  currency VARCHAR(3) NOT NULL DEFAULT 'COP' CHECK (currency IN ('USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `investment_rate_comparisons`
```sql
CREATE TABLE investment_rate_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_scenario_id UUID NOT NULL REFERENCES investment_scenarios(id) ON DELETE CASCADE,
  rate DECIMAL(6, 4) NOT NULL,
  label VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (investment_scenario_id, rate)
);
```

---

## Fórmulas de Cálculo

### Conversión de Tasa EA a Tasa Periódica
```
Tasa Mensual = (1 + EA)^(1/12) - 1
Tasa Diaria = (1 + EA)^(1/365) - 1
```

### Interés Compuesto con Aportes Periódicos
Para capitalización mensual:
```
FV = P(1 + r)^n + PMT × [((1 + r)^n - 1) / r]

Donde:
- FV = Valor Futuro (monto final)
- P = Principal (monto inicial)
- r = Tasa de interés por periodo
- n = Número de periodos
- PMT = Aporte por periodo
```

### Generación de Tabla Detallada
Para cada periodo:
```
Saldo Inicial = Saldo Final del periodo anterior
Interés = Saldo Inicial × Tasa Periódica
Saldo Final = Saldo Inicial + Aporte + Interés
```

---

## Consideraciones Técnicas

1. **Precisión numérica**: Usar `Decimal.js` o similar para cálculos financieros precisos
2. **Performance**: Para capitalización diaria en plazos largos, considerar:
   - Paginación en la tabla de detalle
   - Cálculos en el servidor (no en cliente)
   - Lazy loading de datos
3. **Validación**:
   - Tasa EA entre 0% y 100%
   - Plazo máximo razonable (ej: 480 meses = 40 años)
   - Montos positivos
4. **UX**:
   - Vista previa en tiempo real mientras se ajustan parámetros
   - Formateo de moneda según locale
   - Tooltips explicativos

---

## Mockup de Interfaz

### Página de Lista
```
┌─────────────────────────────────────────────────────────────────┐
│  Simulador de Inversiones                    [+ Nueva Simulación]│
├─────────────────────────────────────────────────────────────────┤
│ Nombre          │ Inicial    │ Mensual  │ Plazo │ Tasa │ Final  │
├─────────────────┼────────────┼──────────┼───────┼──────┼────────┤
│ Ahorro CDT      │ $500,000   │ $100,000 │ 12m   │ 8.5% │ $1.2M  │
│ Fondo Inversión │ $1,000,000 │ $200,000 │ 24m   │ 10%  │ $5.8M  │
└─────────────────────────────────────────────────────────────────┘
```

### Página de Detalle - Tab Resumen
```
┌─────────────────────────────────────────────────────────────────┐
│  [Resumen] [Detalle] [Comparar Tasas]                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Configuración                   En 12 meses tendrías           │
│  ┌─────────────────────┐        ┌─────────────────────────┐     │
│  │ Monto inicial       │        │                         │     │
│  │ $ 500,000      [+-] │        │    $ 1,234,567.89       │     │
│  │                     │        │                         │     │
│  │ Aporte mensual      │        │ ─────────────────────── │     │
│  │ $ 100,000      [+-] │        │ Habrías depositado:     │     │
│  │                     │        │           $ 1,100,000   │     │
│  │ Plazo               │        │ Tu dinero habría crecido│     │
│  │ 12 meses       [+-] │        │             $ 134,567   │     │
│  │                     │        │ Tasa EA:        8.25%   │     │
│  │ Tasa EA             │        └─────────────────────────┘     │
│  │ 8.25 %         [+-] │                                        │
│  │                     │                                        │
│  │ Capitalización      │                                        │
│  │ [Mensual ▼]         │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Página de Detalle - Tab Comparar Tasas
```
┌─────────────────────────────────────────────────────────────────┐
│  [Resumen] [Detalle] [Comparar Tasas]                           │
├─────────────────────────────────────────────────────────────────┤
│  Agregar tasa: [_____%]  [+ Agregar]                            │
│                                                                 │
│  ┌───────────┬─────────────┬─────────────┬──────────────┐       │
│  │ Tasa EA   │ Total Final │ Rendimiento │ Diferencia   │       │
│  ├───────────┼─────────────┼─────────────┼──────────────┤       │
│  │ 8.25% (◉) │ $1,234,567  │ $134,567    │ Base         │       │
│  │ 9.00%     │ $1,245,000  │ $145,000    │ +$10,433     │       │
│  │ 10.00%    │ $1,258,000  │ $158,000    │ +$23,433     │       │
│  │ 7.50%     │ $1,222,000  │ $122,000    │ -$12,567     │       │
│  └───────────┴─────────────┴─────────────┴──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dependencias

- Ninguna nueva dependencia requerida
- Utiliza las mismas herramientas existentes: Recharts, Radix UI, Zod, etc.

---

## Estimación de Archivos a Crear/Modificar

### Nuevos Archivos (~15)
- `/types/invest-simulator.ts`
- `/lib/invest-calculations.ts`
- `/app/api/migrate-invest-simulator/route.ts`
- `/app/api/invest-scenarios/route.ts`
- `/app/api/invest-scenarios/[id]/route.ts`
- `/app/api/invest-scenarios/[id]/projection/route.ts`
- `/app/api/invest-scenarios/[id]/rate-comparisons/route.ts`
- `/components/invest-simulator/invest-calculator-form.tsx`
- `/components/invest-simulator/invest-summary-cards.tsx`
- `/components/invest-simulator/invest-projection-chart.tsx`
- `/components/invest-simulator/investment-schedule-table.tsx`
- `/components/invest-simulator/rate-comparison-panel.tsx`
- `/components/invest-simulator/invest-scenario-list.tsx`
- `/app/simular-inversiones/page.tsx`
- `/app/simular-inversiones/new/page.tsx`
- `/app/simular-inversiones/[id]/page.tsx`

### Archivos a Modificar (~2)
- `/components/sidebar-nav.tsx` o equivalente (agregar navegación)
- `/CLAUDE.md` (documentación)

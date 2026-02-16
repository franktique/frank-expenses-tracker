# Design Document

## Overview

Esta funcionalidad implementará un sistema de relaciones muchos-a-muchos entre categorías y fondos, permitiendo que una categoría pueda estar asociada con múltiples fondos. Esto mejorará la flexibilidad del sistema al permitir que los usuarios organicen sus gastos de manera más granular según diferentes fuentes de financiamiento.

El diseño se basa en la estructura actual donde las categorías tienen una relación uno-a-uno con fondos (`categories.fund_id`), y la expandirá para soportar múltiples relaciones mientras mantiene compatibilidad hacia atrás.

## Architecture

### Database Schema Changes

#### Nueva Tabla: `category_fund_relationships`

```sql
CREATE TABLE category_fund_relationships (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fund_id INTEGER NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, fund_id)
);

CREATE INDEX idx_category_fund_relationships_category_id ON category_fund_relationships(category_id);
CREATE INDEX idx_category_fund_relationships_fund_id ON category_fund_relationships(fund_id);
```

#### Migración de Datos Existentes

- Las relaciones existentes en `categories.fund_id` se migrarán a la nueva tabla
- Se mantendrá el campo `fund_id` en la tabla `categories` por compatibilidad temporal
- Después de la migración exitosa, se puede considerar deprecar el campo `fund_id`

### API Changes

#### Nuevos Endpoints

**GET /api/categories/[id]/funds**

- Retorna todos los fondos asociados a una categoría específica
- Response: `{ funds: Fund[] }`

**POST /api/categories/[id]/funds**

- Asocia fondos con una categoría
- Body: `{ fund_ids: string[] }`
- Reemplaza todas las relaciones existentes

**DELETE /api/categories/[id]/funds/[fund_id]**

- Elimina la relación entre una categoría y un fondo específico
- Valida que no existan gastos con esa combinación

#### Endpoints Modificados

**GET /api/categories**

- Incluirá un array `associated_funds` con todos los fondos relacionados
- Mantendrá `fund_name` por compatibilidad

**GET /api/categories/[id]**

- Incluirá `associated_funds` array
- Mantendrá campos existentes por compatibilidad

**POST /api/categories**

- Aceptará `fund_ids: string[]` además del `fund_id` existente
- Si se proporciona `fund_ids`, se ignorará `fund_id`

**PUT /api/categories/[id]**

- Aceptará `fund_ids: string[]` para actualizar relaciones
- Validará que no se eliminen relaciones con gastos existentes

## Components and Interfaces

### Modified Components

#### `CategoriesView`

- **Multi-select Fund Picker**: Reemplazar el `FundFilter` simple con un componente multi-select
- **Fund Display**: Mostrar múltiples fondos como badges en la tabla
- **Validation**: Validar relaciones antes de eliminar

#### `ExpensesView`

- **Dynamic Fund Dropdown**: El dropdown de fondos se filtrará basado en la categoría seleccionada
- **Default Fund Logic**:
  1. Si el fondo del filtro principal está relacionado con la categoría → usar ese fondo
  2. Si no está relacionado → usar el primer fondo disponible para la categoría
  3. Si la categoría no tiene fondos específicos → mostrar todos los fondos

#### New Component: `MultiFundSelector`

```typescript
interface MultiFundSelectorProps {
  selectedFunds: Fund[];
  onFundsChange: (funds: Fund[]) => void;
  availableFunds: Fund[];
  placeholder?: string;
  className?: string;
}
```

### Data Flow Changes

#### Category-Fund Relationship Management

```typescript
// New service functions
async function getCategoryFunds(categoryId: string): Promise<Fund[]>;
async function updateCategoryFunds(
  categoryId: string,
  fundIds: string[]
): Promise<void>;
async function validateCategoryFundDeletion(
  categoryId: string,
  fundId: string
): Promise<boolean>;
```

#### Expense Form Logic

```typescript
// Enhanced logic for fund selection
function getAvailableFundsForCategory(categoryId: string): Fund[] {
  const categoryFunds = getCategoryFunds(categoryId);
  return categoryFunds.length > 0 ? categoryFunds : allFunds;
}

function getDefaultFundForCategory(
  categoryId: string,
  currentFilterFund: Fund | null
): Fund | null {
  const availableFunds = getAvailableFundsForCategory(categoryId);

  if (currentFilterFund && availableFunds.includes(currentFilterFund)) {
    return currentFilterFund;
  }

  return availableFunds[0] || null;
}
```

## Data Models

### Enhanced Category Type

```typescript
interface Category {
  id: string;
  name: string;
  fund_id?: string; // Deprecated, mantener por compatibilidad
  fund_name?: string; // Deprecated, mantener por compatibilidad
  associated_funds: Fund[]; // New field
  created_at: string;
  updated_at: string;
}
```

### New Relationship Type

```typescript
interface CategoryFundRelationship {
  id: string;
  category_id: string;
  fund_id: string;
  created_at: string;
  updated_at: string;
}
```

### Enhanced Expense Form State

```typescript
interface ExpenseFormState {
  // ... existing fields
  availableFunds: Fund[]; // Computed based on selected category
  defaultFund: Fund | null; // Computed based on category and filter
}
```

## Error Handling

### Validation Rules

1. **Category-Fund Relationship Deletion**
   - Verificar que no existan gastos con la combinación categoría-fondo antes de eliminar
   - Mostrar advertencia con conteo de gastos afectados
   - Permitir eliminación forzada con confirmación explícita

2. **Fund Selection in Expenses**
   - Validar que el fondo seleccionado esté relacionado con la categoría
   - Fallback automático si el fondo no es válido

3. **Migration Safety**
   - Validar integridad de datos durante la migración
   - Rollback automático en caso de errores

### Error Messages

```typescript
const CATEGORY_FUND_ERROR_MESSAGES = {
  RELATIONSHIP_EXISTS: 'La relación entre esta categoría y fondo ya existe',
  EXPENSES_EXIST:
    'No se puede eliminar la relación porque existen {count} gastos registrados',
  INVALID_FUND_FOR_CATEGORY:
    'El fondo seleccionado no está asociado con esta categoría',
  MIGRATION_FAILED: 'Error durante la migración de relaciones categoría-fondo',
};
```

## Testing Strategy

### Unit Tests

1. **Database Operations**
   - CRUD operations para `category_fund_relationships`
   - Validaciones de integridad referencial
   - Migración de datos existentes

2. **API Endpoints**
   - Nuevos endpoints de relaciones categoría-fondo
   - Modificaciones en endpoints existentes
   - Validaciones de negocio

3. **Component Logic**
   - `MultiFundSelector` component
   - Fund filtering logic en `ExpensesView`
   - Default fund selection logic

### Integration Tests

1. **End-to-End Workflows**
   - Crear categoría con múltiples fondos
   - Registrar gasto con selección de fondo dinámico
   - Modificar relaciones y verificar impacto en gastos

2. **Migration Testing**
   - Migración de datos existentes
   - Verificación de integridad post-migración
   - Rollback scenarios

### Performance Tests

1. **Query Performance**
   - Consultas con JOINs para obtener fondos relacionados
   - Índices en tabla de relaciones
   - Caching de relaciones frecuentemente consultadas

## Migration Plan

### Phase 1: Database Schema

1. Crear tabla `category_fund_relationships`
2. Migrar datos existentes desde `categories.fund_id`
3. Verificar integridad de datos

### Phase 2: API Layer

1. Implementar nuevos endpoints
2. Modificar endpoints existentes
3. Mantener compatibilidad hacia atrás

### Phase 3: Frontend Components

1. Implementar `MultiFundSelector`
2. Modificar `CategoriesView`
3. Actualizar `ExpensesView` con lógica dinámica

### Phase 4: Testing & Validation

1. Pruebas exhaustivas
2. Validación con datos reales
3. Performance optimization

### Phase 5: Cleanup (Future)

1. Deprecar campos `fund_id` y `fund_name` en categories
2. Remover código de compatibilidad
3. Optimizar queries

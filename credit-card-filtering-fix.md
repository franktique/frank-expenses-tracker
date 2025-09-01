# Corrección: Filtrado de Tarjetas Inactivas en Formulario de Edición

## 🔧 Problema Identificado

En el formulario de **"Editar Gasto"**, las tarjetas inactivas aparecían listadas en el dropdown, lo cual no es el comportamiento deseado.

## ✅ Solución Implementada

### Cambio Realizado

- **Archivo**: `components/expenses-view.tsx`
- **Línea**: ~1418
- **Cambio**: `showOnlyActive={false}` → `showOnlyActive={true}`

### Comportamiento Correcto Ahora

#### 🆕 Crear Nuevo Gasto

- ✅ Solo muestra tarjetas **activas**
- ✅ Las tarjetas inactivas están completamente ocultas

#### ✏️ Editar Gasto Existente

- ✅ Solo muestra tarjetas **activas**
- ✅ **Excepción**: Si el gasto ya tiene una tarjeta inactiva seleccionada, esa tarjeta específica sigue visible con badge "Inactiva"
- ✅ Las demás tarjetas inactivas están completamente ocultas
- ✅ El usuario puede cambiar solo a tarjetas activas o quitar la selección

## 🎯 Lógica de Filtrado

El `CreditCardSelector` con `showOnlyActive={true}` implementa esta lógica:

```typescript
// Si showOnlyActive es true, solo mostrar tarjetas activas,
// excepto la tarjeta actualmente seleccionada
if (showOnlyActive) {
  return (
    matchesSearch &&
    (creditCard.is_active || creditCard.id === selectedCreditCard?.id)
  );
}
```

## ✅ Verificación

### Casos de Prueba

1. **Tarjeta activa seleccionada**: ✅ Aparece normalmente
2. **Tarjeta inactiva seleccionada**: ✅ Aparece con badge "Inactiva"
3. **Otras tarjetas inactivas**: ✅ Completamente ocultas
4. **Cambio a tarjeta activa**: ✅ Permitido
5. **Cambio a tarjeta inactiva**: ❌ No permitido (no aparecen en lista)
6. **Quitar selección**: ✅ Permitido

### Resultado

- ✅ Build exitoso
- ✅ Comportamiento consistente entre crear y editar
- ✅ UX mejorada: solo opciones válidas disponibles
- ✅ Preservación de datos existentes

## 📝 Impacto

Este cambio mejora la experiencia del usuario al:

- Evitar confusión con tarjetas inactivas en el dropdown
- Mantener la funcionalidad para gastos existentes con tarjetas inactivas
- Proporcionar un comportamiento consistente en toda la aplicación
- Seguir las mejores prácticas de UX para formularios

# Design Document

## Overview

La funcionalidad de logout se implementará agregando un botón de cerrar sesión en el footer del sidebar existente. Esta ubicación es consistente con patrones de UX comunes donde las acciones de cuenta se colocan en la parte inferior de la navegación. La implementación aprovechará el contexto de autenticación existente y seguirá los patrones de diseño establecidos en la aplicación.

## Architecture

### Component Structure

```
AppSidebar (modificado)
├── SidebarHeader (existente)
├── SidebarContent (existente)
└── SidebarFooter (modificado)
    ├── Version info (existente)
    └── LogoutButton (nuevo)
```

### Data Flow

1. Usuario hace clic en el botón de logout
2. LogoutButton llama a `logout()` del AuthContext
3. AuthContext limpia localStorage y actualiza estado
4. ConditionalLayout detecta cambio de autenticación
5. Usuario es redirigido automáticamente a /login
6. Toast notification confirma la acción

## Components and Interfaces

### LogoutButton Component

```typescript
interface LogoutButtonProps {
  // No props necesarios - usa useAuth hook internamente
}

function LogoutButton(): JSX.Element;
```

**Responsabilidades:**

- Renderizar botón con ícono y texto
- Manejar click event para logout
- Mostrar toast de confirmación
- Manejar estados de loading si es necesario

### Modified AppSidebar

El componente existente se modificará para incluir el LogoutButton en el SidebarFooter.

**Cambios:**

- Importar LogoutButton y useAuth
- Agregar LogoutButton al SidebarFooter
- Mantener la información de versión existente

## Data Models

No se requieren nuevos modelos de datos. Se utilizará el AuthContext existente:

```typescript
// Contexto existente - no requiere cambios
type AuthContextType = {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void; // Esta función ya existe
};
```

## Error Handling

### Logout Errors

- **Escenario**: Error al limpiar localStorage
- **Manejo**: Try-catch en LogoutButton, mostrar toast de error
- **Fallback**: Forzar redirect a login incluso si hay error

### Navigation Errors

- **Escenario**: Error en redirect después de logout
- **Manejo**: useRouter con error handling
- **Fallback**: window.location.href como backup

### State Inconsistency

- **Escenario**: Estado de auth inconsistente después de logout
- **Manejo**: Verificar isAuthenticated antes de mostrar botón
- **Fallback**: Refresh de página si estado corrupto

## Testing Strategy

### Unit Tests

```typescript
// LogoutButton.test.tsx
describe('LogoutButton', () => {
  it('should call logout when clicked');
  it('should show loading state during logout');
  it('should display toast on successful logout');
  it('should handle logout errors gracefully');
});

// AppSidebar.test.tsx
describe('AppSidebar with logout', () => {
  it('should render logout button when authenticated');
  it('should not render logout button when not authenticated');
});
```

### Integration Tests

- Verificar flujo completo de logout
- Confirmar redirect a login después de logout
- Validar limpieza de localStorage
- Probar navegación después de logout

### Manual Testing Checklist

- [ ] Botón visible en todas las páginas autenticadas
- [ ] Click en botón ejecuta logout correctamente
- [ ] Toast de confirmación se muestra
- [ ] Redirect a login funciona
- [ ] localStorage se limpia
- [ ] Intentar acceder a páginas protegidas redirige a login
- [ ] Diseño visual consistente con la aplicación
- [ ] Tooltip funciona correctamente

## Implementation Details

### Styling

- Usar clases de Tailwind consistentes con el resto de la aplicación
- Ícono: LogOut de lucide-react
- Colores: Seguir tema de la aplicación (muted-foreground para texto)
- Hover states: Consistentes con otros botones del sidebar

### Positioning

- Ubicación: SidebarFooter, arriba de la información de versión
- Layout: Flex column con gap apropiado
- Spacing: Padding consistente con el resto del footer

### Accessibility

- Aria-label descriptivo
- Keyboard navigation support
- Focus states visibles
- Screen reader friendly

### Performance

- Componente ligero sin dependencias pesadas
- Lazy loading no necesario (siempre visible cuando autenticado)
- Memoización no requerida (componente simple)

## Visual Design

### Button Appearance

```
[🚪 Cerrar Sesión]
```

- Ícono: LogOut (door with arrow)
- Texto: "Cerrar Sesión"
- Estilo: Botón secundario, no prominente
- Tamaño: Consistente con elementos del sidebar

### Layout in Footer

```
┌─────────────────────┐
│ [🚪 Cerrar Sesión]  │
│ Budget Tracker v1.0 │
└─────────────────────┘
```

### Toast Notification

- Mensaje: "Sesión cerrada exitosamente"
- Tipo: Success (verde)
- Duración: 3 segundos
- Posición: Top-right (default)

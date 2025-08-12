# Requirements Document

## Introduction

Esta funcionalidad permitirá establecer relaciones entre categorías de presupuesto y múltiples fondos, mejorando la flexibilidad en el registro de gastos. Los usuarios podrán asociar cada categoría con uno o más fondos específicos, y al registrar gastos, el sistema mostrará por defecto el fondo seleccionado en el filtro principal pero permitirá cambiar a cualquier otro fondo relacionado con esa categoría.

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero poder asociar una categoría de presupuesto con múltiples fondos, para que pueda organizar mejor mis gastos según diferentes fuentes de financiamiento.

#### Acceptance Criteria

1. WHEN accedo a la configuración de categorías THEN el sistema SHALL mostrar una opción para seleccionar múltiples fondos por categoría
2. WHEN selecciono múltiples fondos para una categoría THEN el sistema SHALL guardar estas relaciones en la base de datos
3. WHEN una categoría no tiene fondos asociados THEN el sistema SHALL permitir gastos desde cualquier fondo disponible
4. IF una categoría tiene fondos específicos asociados THEN el sistema SHALL restringir los gastos solo a esos fondos

### Requirement 2

**User Story:** Como usuario, quiero que al registrar un gasto se muestre por defecto el fondo seleccionado en el filtro principal, para mantener consistencia con mi contexto de trabajo actual.

#### Acceptance Criteria

1. WHEN abro el formulario de registro de gastos THEN el sistema SHALL preseleccionar el fondo del filtro principal si está relacionado con la categoría
2. IF el fondo del filtro principal no está relacionado con la categoría seleccionada THEN el sistema SHALL preseleccionar el primer fondo disponible para esa categoría
3. WHEN cambio la categoría en el formulario THEN el sistema SHALL actualizar automáticamente las opciones de fondos disponibles
4. WHEN no hay fondo seleccionado en el filtro principal THEN el sistema SHALL mostrar el primer fondo disponible para la categoría

### Requirement 3

**User Story:** Como usuario, quiero poder seleccionar un fondo diferente al predeterminado al registrar un gasto, para tener flexibilidad en la asignación de fondos.

#### Acceptance Criteria

1. WHEN registro un gasto THEN el sistema SHALL mostrar un dropdown con solo los fondos relacionados a la categoría seleccionada
2. WHEN abro el dropdown de fondos THEN el sistema SHALL mostrar únicamente los fondos asociados a la categoría actual
3. WHEN selecciono un fondo diferente THEN el sistema SHALL permitir completar el registro del gasto con el nuevo fondo
4. IF una categoría no tiene fondos específicos asociados THEN el sistema SHALL mostrar todos los fondos disponibles

### Requirement 4

**User Story:** Como usuario, quiero que el sistema mantenga la integridad de datos al modificar relaciones categoría-fondo, para evitar inconsistencias en mis registros existentes.

#### Acceptance Criteria

1. WHEN elimino la relación entre una categoría y un fondo THEN el sistema SHALL validar que no existan gastos registrados con esa combinación
2. IF existen gastos con una combinación categoría-fondo que se va a eliminar THEN el sistema SHALL mostrar una advertencia y solicitar confirmación
3. WHEN confirmo la eliminación de una relación con gastos existentes THEN el sistema SHALL mantener los gastos existentes pero prevenir nuevos registros
4. WHEN modifico las relaciones de una categoría THEN el sistema SHALL actualizar inmediatamente las opciones disponibles en formularios activos

### Requirement 5

**User Story:** Como usuario, quiero poder visualizar claramente qué fondos están asociados a cada categoría, para entender mejor la configuración de mi sistema.

#### Acceptance Criteria

1. WHEN veo la lista de categorías THEN el sistema SHALL mostrar los fondos asociados a cada categoría
2. WHEN una categoría tiene múltiples fondos THEN el sistema SHALL mostrar todos los fondos de manera clara y legible
3. WHEN una categoría no tiene fondos específicos THEN el sistema SHALL indicar que acepta "Todos los fondos"
4. WHEN filtro por fondo en cualquier vista THEN el sistema SHALL mostrar solo las categorías relacionadas con ese fondo

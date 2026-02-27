import { CreditCardDashboardView } from '@/components/credit-card-dashboard-view';

export default function CreditCardDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Tarjetas de Crédito</h1>
        <p className="text-muted-foreground mt-1">
          Gasto actual vs presupuesto proyectado por tarjeta para el período activo
        </p>
      </div>
      <CreditCardDashboardView />
    </div>
  );
}

import { CotizacionDetail } from '@/components/cotizaciones/cotizacion-detail';

export const metadata = {
  title: 'Cotización | Budget Tracker',
};

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <CotizacionDetail cotizacionId={id} />
    </div>
  );
}

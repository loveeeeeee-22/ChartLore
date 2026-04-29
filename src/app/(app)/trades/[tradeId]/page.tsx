import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { TradeForm } from "@/components/trades/trade-form";
import { trades } from "@/lib/mock-data";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;
  const trade = trades.find((item) => item.id === tradeId);

  if (!trade) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trades"
        title={`Edit ${trade.symbol}`}
        description="Use the same journaling form to refine fills, thesis notes, and risk parameters after the session."
      />
      <TradeForm initialTrade={trade} />
    </div>
  );
}

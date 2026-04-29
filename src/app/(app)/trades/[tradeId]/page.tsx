import { PageHeader } from "@/components/common/page-header";
import { TradeForm } from "@/components/trades/trade-form";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }>;
}) {
  const { tradeId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trades"
        title="Review and complete this trade"
        description="Finish the journal entry after the session by assigning account context, tags, notes, and any missing execution details."
      />
      <TradeForm tradeId={tradeId} />
    </div>
  );
}

import { PageHeader } from "@/components/common/page-header";
import { TradeForm } from "@/components/trades/trade-form";

export default function NewTradePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trades"
        title="Log a new trade with structured journal context"
        description="Manual entry is the first ingestion mode in phase one. Every field here flows into the dashboard, reports, strategy stats, and analytics surfaces."
      />
      <TradeForm />
    </div>
  );
}

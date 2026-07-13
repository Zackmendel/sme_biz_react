import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { fetchSales, fetchPurchases, type Sale, type Purchase } from "@/lib/supabase-data";
import { Loader2, Calendar, FileText, Printer, ArrowUpRight, ArrowDownRight, Landmark } from "lucide-react";

export function DailyReportPage() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to today's date formatted as YYYY-MM-DD in local time
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const businessId = profile?.business_id;

  const loadReportData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setError(null);

      const [salesData, purchasesData] = await Promise.all([
        fetchSales(businessId),
        fetchPurchases(businessId),
      ]);

      setSales(salesData);
      setPurchases(purchasesData);
    } catch (err: unknown) {
      setError("Failed to fetch transaction logs.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [businessId]);

  // Filter items matching the selected date
  const dailySales = sales.filter((s) => {
    const saleDate = new Date(s.created_at);
    const year = saleDate.getFullYear();
    const month = String(saleDate.getMonth() + 1).padStart(2, "0");
    const day = String(saleDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return dateStr === selectedDate;
  });

  const dailyPurchases = purchases.filter((p) => {
    const purchaseDate = new Date(p.created_at);
    const year = purchaseDate.getFullYear();
    const month = String(purchaseDate.getMonth() + 1).padStart(2, "0");
    const day = String(purchaseDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return dateStr === selectedDate;
  });

  // Calculate Metrics
  const totalSales = dailySales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalPurchases = dailyPurchases.reduce((sum, p) => sum + Number(p.total), 0);
  const netProfit = totalSales - totalPurchases;
  const transactionsCount = dailySales.length + dailyPurchases.length;

  // Find daily top selling item
  const itemCounts: Record<string, number> = {};
  dailySales.forEach((s) => {
    itemCounts[s.item_name] = (itemCounts[s.item_name] || 0) + s.quantity;
  });
  let topItem = "—";
  let maxQty = 0;
  Object.entries(itemCounts).forEach(([item, qty]) => {
    if (qty > maxQty) {
      maxQty = qty;
      topItem = item;
    }
  });

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Date selector and Print bar — Hidden during print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/65 border border-border/80 p-4 rounded-2xl shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-medium">Select Report Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-10 rounded-lg border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
          />
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
        >
          <Printer className="h-4.5 w-4.5" />
          Print Report
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive print:hidden">
          {error}
        </div>
      )}

      {/* Printable Report Document Container */}
      <div className="bg-card print:bg-transparent border border-border/60 print:border-none rounded-2xl p-8 shadow-md print:shadow-none space-y-8">
        {/* Printable Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Operations Report</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Generated for date: <strong className="text-foreground">{new Date(selectedDate).toLocaleDateString("en-NG", { dateStyle: "long" })}</strong>
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-muted-foreground">
            <h2 className="font-semibold text-foreground text-sm uppercase">{profile?.email}</h2>
            <p className="mt-1">Scope: {profile?.role.toUpperCase()}</p>
          </div>
        </div>

        {/* 1-Day Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Sales Card */}
          <div className="border border-border/80 rounded-xl p-4 bg-secondary/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Sales Revenue</span>
            <div className="mt-2 flex items-baseline gap-1 text-emerald-400">
              <ArrowUpRight className="h-4 w-4 shrink-0" />
              <span className="text-lg font-bold">₦{totalSales.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{dailySales.length} items sold</p>
          </div>

          {/* Expenses Card */}
          <div className="border border-border/80 rounded-xl p-4 bg-secondary/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Expenditure</span>
            <div className="mt-2 flex items-baseline gap-1 text-rose-400">
              <ArrowDownRight className="h-4 w-4 shrink-0" />
              <span className="text-lg font-bold">₦{totalPurchases.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{dailyPurchases.length} expense items</p>
          </div>

          {/* Net profit */}
          <div className="border border-border/80 rounded-xl p-4 bg-secondary/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Net Position</span>
            <div className="mt-2 flex items-baseline gap-1 text-primary">
              <Landmark className="h-4 w-4 shrink-0" />
              <span className="text-lg font-bold">₦{netProfit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{transactionsCount} total transactions</p>
          </div>

          {/* Top item */}
          <div className="border border-border/80 rounded-xl p-4 bg-secondary/15 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Top Item Sold</span>
            <span className="text-sm font-bold text-foreground mt-2 truncate" title={topItem}>
              {topItem}
            </span>
            <p className="text-[10px] text-muted-foreground mt-2">{maxQty > 0 ? `Qty: ${maxQty}` : "No items"}</p>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-6 pt-4 border-t border-border/60">
          {/* Sales list */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-1.5 text-foreground">
              Sales Ledger ({dailySales.length})
            </h3>
            {dailySales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales logged for this date.</p>
            ) : (
              <div className="overflow-hidden border border-border/80 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-secondary/20 font-medium text-muted-foreground">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Customer Details</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Discount</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {dailySales.map((s) => (
                      <tr key={s.id} className="hover:bg-secondary/5">
                        <td className="p-3 font-medium text-foreground">{s.item_name}</td>
                        <td className="p-3 text-muted-foreground">{s.customer_details || "—"}</td>
                        <td className="p-3 text-foreground">{s.quantity}</td>
                        <td className="p-3 text-foreground">₦{s.price_per_unit.toLocaleString("en-NG")}</td>
                        <td className="p-3 text-destructive">
                          {s.discount > 0 ? `-₦${s.discount.toLocaleString("en-NG")}` : "—"}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-400">
                          ₦{s.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Purchases list */}
          <div className="space-y-3 pt-4 border-t border-border/40">
            <h3 className="font-semibold text-base flex items-center gap-1.5 text-foreground">
              Purchases Ledger ({dailyPurchases.length})
            </h3>
            {dailyPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases logged for this date.</p>
            ) : (
              <div className="overflow-hidden border border-border/80 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-secondary/20 font-medium text-muted-foreground">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Vendor Details</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {dailyPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/5">
                        <td className="p-3 font-medium text-foreground">{p.item_name}</td>
                        <td className="p-3 text-muted-foreground">{p.vendor_details || "—"}</td>
                        <td className="p-3 text-foreground">{p.quantity}</td>
                        <td className="p-3 text-foreground">₦{p.price_per_unit.toLocaleString("en-NG")}</td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          ₦{p.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

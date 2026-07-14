import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { fetchDailySummaries, fetchFlaggedTransactions, type DailySummary, type Sale, type Purchase } from "@/lib/supabase-data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Landmark, Receipt, Users, Star, Calendar, AlertTriangle, ShieldAlert } from "lucide-react";

export function DashboardPage() {
  const { profile } = useAuth();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [flaggedSales, setFlaggedSales] = useState<Sale[]>([]);
  const [flaggedPurchases, setFlaggedPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Timeframe filter state: '7d' | '30d' | '90d' | 'all'
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const businessId = profile?.business_id;

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!businessId) return;
      try {
        setLoading(true);
        const [summariesData, flaggedData] = await Promise.all([
          fetchDailySummaries(businessId),
          fetchFlaggedTransactions(businessId),
        ]);
        setSummaries(summariesData);
        setFlaggedSales(flaggedData.sales);
        setFlaggedPurchases(flaggedData.purchases);
      } catch (err: unknown) {
        setError("Failed to fetch dashboard data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [businessId]);

  // Filter summaries based on timeframe
  const filteredSummaries = summaries.filter((s) => {
    if (timeframe === "all") return true;

    const date = new Date(s.summary_date);
    const limitDate = new Date();

    if (timeframe === "7d") {
      limitDate.setDate(limitDate.getDate() - 7);
    } else if (timeframe === "30d") {
      limitDate.setDate(limitDate.getDate() - 30);
    } else if (timeframe === "90d") {
      limitDate.setDate(limitDate.getDate() - 90);
    }

    return date >= limitDate;
  });

  // Calculate Metrics
  const totalSales = filteredSummaries.reduce((sum, s) => sum + Number(s.total_sales), 0);
  const totalPurchases = filteredSummaries.reduce((sum, s) => sum + Number(s.total_purchases), 0);
  const netPosition = totalSales - totalPurchases;
  const transactionCount = filteredSummaries.reduce((sum, s) => sum + s.transaction_count, 0);
  const uniqueCustomers = filteredSummaries.reduce((sum, s) => sum + s.unique_customers, 0);

  // Find most frequent top item
  const itemCounts: Record<string, number> = {};
  filteredSummaries.forEach((s) => {
    if (s.top_item) {
      itemCounts[s.top_item] = (itemCounts[s.top_item] || 0) + 1;
    }
  });
  let topItem = "—";
  let maxCount = 0;
  Object.entries(itemCounts).forEach(([item, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topItem = item;
    }
  });

  // Format chart data
  const chartData = filteredSummaries.map((s) => ({
    date: new Date(s.summary_date).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
    }),
    Income: Number(s.total_sales),
    Expenditure: Number(s.total_purchases),
  }));

  const formatNaira = (value: number) => {
    return "₦" + value.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-md mx-auto mt-12">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time financial performance pre-aggregated from daily summaries.
          </p>
        </div>

        {/* Timeframe Filter */}
        <div className="flex border border-border/80 bg-card rounded-lg p-1 shadow-sm self-start sm:self-auto">
          {(["7d", "30d", "90d", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md uppercase transition-all ${
                timeframe === t
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Time" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Total Income</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-emerald-400">
              ₦{totalSales.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Cumulative sales recorded</p>
          </div>
        </div>

        {/* Expenditure Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Total Expenditure</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-rose-400">
              ₦{totalPurchases.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Cumulative purchases logged</p>
          </div>
        </div>

        {/* Net Position Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Net Position</span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className={`text-2xl font-bold tracking-tight ${netPosition >= 0 ? "text-primary" : "text-rose-400"}`}>
              ₦{netPosition.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Net profit/deficit position</p>
          </div>
        </div>

        {/* Transactions Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Total Transactions</span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-sky-400" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {transactionCount}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Combined sales and purchases</p>
          </div>
        </div>

        {/* Unique Customers Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Customer Contacts</span>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-400" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {uniqueCustomers}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Daily customer interactions</p>
          </div>
        </div>

        {/* Top Product Card */}
        <div className="rounded-2xl border border-border bg-card/65 p-6 shadow-md hover:border-primary/20 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Top Earning Item</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-lg font-bold tracking-tight text-foreground truncate" title={topItem}>
              {topItem}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Most frequent daily top seller</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">Financial Performance Trends</h3>
          <p className="text-xs text-muted-foreground">Income and expenditure comparison over the chosen period.</p>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 border border-dashed border-border rounded-xl p-8 bg-card/10">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No historical summaries found for this timeframe.</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  {/* Income Gradient */}
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.72 0.19 145)" stopOpacity={0} />
                  </linearGradient>
                  {/* Expenditure Gradient */}
                  <linearGradient id="colorExpenditure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.012 285)" />
                <XAxis dataKey="date" stroke="oklch(0.65 0.015 285)" fontSize={11} tickLine={false} />
                <YAxis stroke="oklch(0.65 0.015 285)" fontSize={11} tickLine={false} tickFormatter={formatNaira} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.17 0.008 285)",
                    border: "1px solid oklch(0.28 0.012 285)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ fontSize: "12px" }}
                  labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "oklch(0.985 0 0)", marginBottom: "4px" }}
                  formatter={(value: any) => [formatNaira(Number(value)), undefined]}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="Income"
                  stroke="oklch(0.72 0.19 145)"
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Expenditure"
                  stroke="oklch(0.65 0.2 25)"
                  fillOpacity={1}
                  fill="url(#colorExpenditure)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Fraud & Anomaly Alerts Panel */}
      <div className="rounded-2xl border border-border bg-card/45 p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
            <div>
              <h3 className="font-semibold text-lg">Fraud & Anomaly Alerts</h3>
              <p className="text-xs text-muted-foreground">Rules-based compliance flags triggered during nightly rollups.</p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {flaggedSales.length + flaggedPurchases.length} Active
          </span>
        </div>

        {flaggedSales.length === 0 && flaggedPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground bg-secondary/10 border border-dashed border-border rounded-xl">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">All ledger records are clean.</p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">No price deviations, off-hours actions, or quantity spikes detected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {flaggedSales.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-3 px-4 font-medium text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                        Sale
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{s.item_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ₦{(Number(s.price_per_unit) * Number(s.quantity)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold uppercase text-[9px]">
                        Flagged
                      </span>
                    </td>
                  </tr>
                ))}
                {flaggedPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-3 px-4 font-medium text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium">
                        Purchase
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{p.item_name}</td>
                    <td className="py-3 px-4 text-right font-bold text-foreground">
                      ₦{(Number(p.price_per_unit) * Number(p.quantity)).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold uppercase text-[9px]">
                        Flagged
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

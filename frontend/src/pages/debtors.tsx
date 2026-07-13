import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { fetchDebtors, createDebtor, markDebtorPaid, type Debtor } from "@/lib/supabase-data";
import { Loader2, Plus, Landmark, CheckCircle, AlertCircle, Sparkles } from "lucide-react";

export function DebtorsPage() {
  const { profile } = useAuth();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [amountNaira, setAmountNaira] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Active status tab: 'active' | 'settled'
  const [activeTab, setActiveTab] = useState<"active" | "settled">("active");

  const businessId = profile?.business_id;

  const loadDebtorsList = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await fetchDebtors(businessId);
      setDebtors(data);
    } catch (err: unknown) {
      setError("Failed to fetch debtors.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtorsList();
  }, [businessId]);

  const handleAddDebtor = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setError(null);
    setSubmitting(true);

    const parsedAmount = parseFloat(amountNaira);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a valid number greater than 0.");
      setSubmitting(false);
      return;
    }

    // Convert Naira to Kobo (integers for database precision)
    const amountKobo = Math.round(parsedAmount * 100);

    try {
      const newDebtor = await createDebtor({
        business_id: businessId,
        customer_name: customerName,
        amount: amountKobo,
      });

      setDebtors((prev) => [newDebtor, ...prev]);
      setCustomerName("");
      setAmountNaira("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setError("Failed to log debtor.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (debtorId: number) => {
    setError(null);
    try {
      const updated = await markDebtorPaid(debtorId);
      setDebtors((prev) => prev.map((d) => (d.id === debtorId ? updated : d)));
    } catch (err: unknown) {
      setError("Failed to settle debt.");
      console.error(err);
    }
  };

  const activeDebts = debtors.filter((d) => !d.is_paid);
  const settledDebts = debtors.filter((d) => d.is_paid);

  const totalActiveNaira = activeDebts.reduce((sum, d) => sum + d.amount, 0) / 100;

  const canEdit = profile?.role && ["owner", "admin", "staff"].includes(profile.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debtors Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Track and settle store credit debts from customers.
          </p>
        </div>
        {canEdit && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Log Debtor
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* BBF/Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 rounded-2xl border border-border bg-card/50 p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Outstanding Debts
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-amber-500 mt-2">
              ₦{totalActiveNaira.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Unsettled store credits awaiting customer payment.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="md:col-span-2 flex flex-col justify-end space-y-4">
          <div className="flex border border-border bg-card rounded-xl p-1 shadow-sm self-start">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "active"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <AlertCircle className="h-4.5 w-4.5" />
              Active Debts ({activeDebts.length})
            </button>
            <button
              onClick={() => setActiveTab("settled")}
              className={`flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-lg transition-all ${
                activeTab === "settled"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle className="h-4.5 w-4.5" />
              Settled Debts ({settledDebts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Log Debtor Form */}
      {showAddForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg max-w-md">
          <h2 className="text-lg font-semibold mb-4">Log New Debtor</h2>
          <form onSubmit={handleAddDebtor} className="space-y-4">
            <div className="space-y-3">
              {/* Customer Name */}
              <div className="space-y-1">
                <label htmlFor="debt-customer" className="text-xs font-medium text-muted-foreground">
                  Customer Name *
                </label>
                <input
                  id="debt-customer"
                  type="text"
                  required
                  placeholder="e.g. Ibrahim Yusuf"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Amount in Naira */}
              <div className="space-y-1">
                <label htmlFor="debt-amount" className="text-xs font-medium text-muted-foreground">
                  Debt Amount (₦) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">₦</span>
                  <input
                    id="debt-amount"
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={amountNaira}
                    onChange={(e) => setAmountNaira(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 pl-7 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 h-10 rounded-lg border border-border transition-colors hover:bg-secondary text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 text-sm"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Log Debt
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Debtors List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "active" ? (
        /* Active Debts List */
        activeDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl p-8 bg-card/10">
            <Sparkles className="h-10 w-10 text-primary mb-2" />
            <p className="text-foreground font-medium">All debts cleared!</p>
            <p className="text-sm text-muted-foreground mt-1">There are no outstanding debts to collect.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDebts.map((debt) => (
              <div
                key={debt.id}
                className="rounded-xl border border-border bg-card/40 p-5 flex flex-col justify-between hover:border-border/80 transition-all"
              >
                <div>
                  <h3 className="font-semibold text-base text-foreground">{debt.customer_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged on {new Date(debt.created_at).toLocaleDateString("en-NG")}
                  </p>
                  <p className="text-xl font-bold text-amber-500 mt-3">
                    ₦{(debt.amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleMarkPaid(debt.id)}
                    className="w-full flex h-9 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary font-medium text-xs transition-all hover:bg-primary hover:text-primary-foreground mt-4"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Settled
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* Settled Debts List */
        settledDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl p-8 bg-card/10">
            <Landmark className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-foreground font-medium">No settled debts</p>
            <p className="text-sm text-muted-foreground mt-1">Settle a debt in the active tab to see history here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settledDebts.map((debt) => (
              <div
                key={debt.id}
                className="rounded-xl border border-border bg-card/25 p-5 flex flex-col justify-between opacity-80"
              >
                <div>
                  <h3 className="font-semibold text-base text-foreground">{debt.customer_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged on {new Date(debt.created_at).toLocaleDateString("en-NG")}
                  </p>
                  <p className="text-lg font-semibold text-muted-foreground line-through mt-2">
                    ₦{(debt.amount / 100).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {debt.paid_at && (
                  <div className="mt-4 pt-3 border-t border-border/40 text-[10px] text-emerald-400">
                    Settled on {new Date(debt.paid_at).toLocaleString("en-NG")}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import {
  fetchOpenCycles,
  createAccountingCycle,
  updateAccountingCycle,
  fetchProducts,
  fetchSales,
  fetchPurchases,
  createSale,
  createPurchase,
  type AccountingCycle,
  type Product,
  type Sale,
  type Purchase,
} from "@/lib/supabase-data";
import { triggerDailyAggregation } from "@/lib/api";
import {
  Loader2,
  Calendar,
  AlertCircle,
  ShoppingCart,
  ShoppingBag,
  Filter,
  Settings,
  Edit3,
  X,
  Check,
} from "lucide-react";
import { ErrorBanner } from "@/components/ledger/error-banner";
import { FormField } from "@/components/ledger/form-field";
import { FormInput, FormSelect } from "@/components/ledger/form-input";
import { TransactionTable } from "@/components/ledger/transaction-table";
import { SaleForm, PurchaseForm } from "@/components/ledger/transaction-form";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Loading / gating states ──────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

interface NoCycleGateProps {
  isOwnerOrAdmin: boolean;
  error: string | null;
  submitting: boolean;
  periodType: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  setPeriodType: (v: NoCycleGateProps["periodType"]) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  bbf: string;
  setBbf: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

function NoCycleGate({
  isOwnerOrAdmin,
  error,
  submitting,
  periodType,
  setPeriodType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  bbf,
  setBbf,
  onSubmit,
}: NoCycleGateProps) {
  return (
    <div className="max-w-md mx-auto space-y-6 pt-12">
      <div className="flex flex-col items-center justify-center text-center p-6 bg-card border border-border rounded-2xl shadow-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 mb-4">
          <Calendar className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">No Open Accounting Cycle</h2>
        <p className="text-sm text-muted-foreground mt-2">
          You need to open a cycle before entering sales or purchases.
        </p>

        {isOwnerOrAdmin ? (
          <form onSubmit={onSubmit} className="w-full text-left space-y-4 mt-6">
            <FormField id="cycle-period" label="Period Type">
              <FormSelect
                id="cycle-period"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as NoCycleGateProps["periodType"])}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </FormSelect>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField id="cycle-start" label="Start Date">
                <FormInput
                  id="cycle-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </FormField>
              <FormField id="cycle-end" label="End Date">
                <FormInput
                  id="cycle-end"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </FormField>
            </div>

            <FormField id="cycle-bbf" label="Balance Brought Forward (₦)">
              <FormInput
                id="cycle-bbf"
                type="number"
                required
                min="0"
                placeholder="0.00"
                value={bbf}
                onChange={(e) => setBbf(e.target.value)}
              />
            </FormField>

            <ErrorBanner message={error ?? ""} />

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all text-sm mt-4"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm &amp; Open Cycle
            </button>
          </form>
        ) : (
          <div className="mt-6 flex items-start gap-2 bg-secondary/30 p-4 border border-border/40 rounded-xl text-left">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-xs text-muted-foreground leading-normal">
              Please contact your business Owner or Admin to open an accounting
              cycle so you can log sales and purchases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab toggle ───────────────────────────────────────────────────────────────

interface TabToggleProps {
  active: "sales" | "purchases";
  onChange: (tab: "sales" | "purchases") => void;
}

function TabToggle({ active, onChange }: TabToggleProps) {
  const tab = (
    id: "sales" | "purchases",
    Icon: typeof ShoppingCart,
    label: string
  ) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={`flex-1 flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg transition-all ${
        active === id
          ? "bg-primary text-primary-foreground shadow"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="flex border border-border/80 bg-card rounded-xl p-1 shadow-sm">
      {tab("sales", ShoppingCart, "Log Sale")}
      {tab("purchases", ShoppingBag, "Log Purchase")}
    </div>
  );
}

// ─── Cycle control card ───────────────────────────────────────────────────────

interface CycleControlCardProps {
  cycles: AccountingCycle[];
  isOwnerOrAdmin: boolean;
  closing: boolean;
  closingStatus: string | null;
  adjustingCycleId: string | null;
  adjustStartDate: string;
  adjustEndDate: string;
  setAdjustingCycleId: (id: string | null) => void;
  setAdjustStartDate: (v: string) => void;
  setAdjustEndDate: (v: string) => void;
  onCloseCycle: (cycle: AccountingCycle) => void;
  onUpdateDates: (cycleId: string) => void;
}

function CycleControlCard({
  cycles,
  isOwnerOrAdmin,
  closing,
  closingStatus,
  adjustingCycleId,
  adjustStartDate,
  adjustEndDate,
  setAdjustingCycleId,
  setAdjustStartDate,
  setAdjustEndDate,
  onCloseCycle,
  onUpdateDates,
}: CycleControlCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
          <Settings className="h-4 w-4 text-primary" />
          Accounting Cycle Control
        </h3>
        {cycles[0] && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary capitalize">
            {cycles[0].period_type}
          </span>
        )}
      </div>

      {cycles.map((cycle) => (
        <div key={cycle.id} className="space-y-3 text-sm">
          {adjustingCycleId === cycle.id ? (
            /* ── Inline date editor ── */
            <div className="space-y-2 border border-primary/20 bg-primary/5 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Start Date</label>
                  <FormInput
                    inputSize="sm"
                    type="date"
                    value={adjustStartDate}
                    onChange={(e) => setAdjustStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">End Date</label>
                  <FormInput
                    inputSize="sm"
                    type="date"
                    value={adjustEndDate}
                    onChange={(e) => setAdjustEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAdjustingCycleId(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-secondary/50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateDates(cycle.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Cycle info display ── */
            <div className="bg-secondary/20 border border-border/40 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Active Period:</span>
                {isOwnerOrAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustingCycleId(cycle.id);
                      setAdjustStartDate(cycle.start_date);
                      setAdjustEndDate(cycle.end_date);
                    }}
                    className="text-primary hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Edit3 className="h-3 w-3" />
                    Edit Dates
                  </button>
                )}
              </div>
              <p className="font-medium text-foreground">
                {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                <div>
                  <span>Brought Forward:</span>
                  <p className="font-semibold text-foreground">
                    ₦{Number(cycle.balance_brought_forward).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span>Accrued Debts:</span>
                  <p className="font-semibold text-destructive">
                    ₦{Number(cycle.debts_accrued).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to end this accounting cycle now and generate reports? This rolls balances forward to a new cycle."
                  )
                ) {
                  onCloseCycle(cycle);
                }
              }}
              disabled={closing}
              className="w-full flex h-9 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 transition-all text-xs"
            >
              {closing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              End Cycle &amp; Generate Report
            </button>
          )}
        </div>
      ))}

      {closingStatus && (
        <div className="text-xs text-primary flex items-center gap-1.5 bg-primary/10 border border-primary/20 p-3 rounded-lg animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>{closingStatus}</span>
        </div>
      )}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

interface FilterBarProps {
  activeTab: "sales" | "purchases";
  filterProduct: string;
  setFilterProduct: (v: string) => void;
  filterDetail: string;
  setFilterDetail: (v: string) => void;
  filterStartDate: string;
  setFilterStartDate: (v: string) => void;
  filterEndDate: string;
  setFilterEndDate: (v: string) => void;
}

function FilterBar({
  activeTab,
  filterProduct,
  setFilterProduct,
  filterDetail,
  setFilterDetail,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
}: FilterBarProps) {
  const detailLabel = activeTab === "sales" ? "Customer" : "Vendor";
  const detailPlaceholder = activeTab === "sales" ? "Search customer…" : "Search vendor…";

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Filter Ledger History</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <FormField id="filter-prod" label="Item Name">
          <FormInput
            id="filter-prod"
            inputSize="sm"
            type="text"
            placeholder="Search item…"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="bg-secondary/20"
          />
        </FormField>
        <FormField id="filter-detail" label={detailLabel}>
          <FormInput
            id="filter-detail"
            inputSize="sm"
            type="text"
            placeholder={detailPlaceholder}
            value={filterDetail}
            onChange={(e) => setFilterDetail(e.target.value)}
            className="bg-secondary/20"
          />
        </FormField>
        <FormField id="filter-start" label="Start Date">
          <FormInput
            id="filter-start"
            inputSize="sm"
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="bg-secondary/20"
          />
        </FormField>
        <FormField id="filter-end" label="End Date">
          <FormInput
            id="filter-end"
            inputSize="sm"
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="bg-secondary/20"
          />
        </FormField>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function LedgerPage() {
  const { profile, user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [openCycles, setOpenCycles] = useState<AccountingCycle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"sales" | "purchases">("sales");

  // Cycle creation form
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bbf, setBbf] = useState("0");

  // Sales form
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [discount, setDiscount] = useState("0");
  const [customerDetails, setCustomerDetails] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "transfer" | "card" | "credit">("cash");
  const [salesCycleId, setSalesCycleId] = useState("");

  // Purchases form
  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseCustomItemName, setPurchaseCustomItemName] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("1");
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState("");
  const [vendorDetails, setVendorDetails] = useState("");
  const [purchasesCycleId, setPurchasesCycleId] = useState("");

  // Filters
  const [filterProduct, setFilterProduct] = useState("");
  const [filterDetail, setFilterDetail] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Cycle controls
  const [closing, setClosing] = useState(false);
  const [closingStatus, setClosingStatus] = useState<string | null>(null);
  const [adjustingCycleId, setAdjustingCycleId] = useState<string | null>(null);
  const [adjustStartDate, setAdjustStartDate] = useState("");
  const [adjustEndDate, setAdjustEndDate] = useState("");

  const businessId = profile?.business_id;
  const isOwnerOrAdmin = profile?.role && ["owner", "admin"].includes(profile.role);
  const canLog = profile?.role && ["owner", "admin", "staff"].includes(profile.role);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setError(null);

      const [cyclesData, productsData, salesData, purchasesData] = await Promise.all([
        fetchOpenCycles(businessId),
        fetchProducts(businessId),
        fetchSales(businessId),
        fetchPurchases(businessId),
      ]);

      setOpenCycles(cyclesData);
      setProducts(productsData.filter((p) => !p.is_archived));
      setSales(salesData);
      setPurchases(purchasesData);

      const firstCycle = cyclesData[0];
      if (firstCycle) {
        setSalesCycleId(firstCycle.id);
        setPurchasesCycleId(firstCycle.id);
      }
    } catch (err: unknown) {
      setError("Failed to load ledger data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCloseCycleEarly = async (cycle: AccountingCycle) => {
    if (!isOwnerOrAdmin) return;
    setClosing(true);
    setClosingStatus("Closing cycle and carrying forward balances…");
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await updateAccountingCycle(cycle.id, { end_date: todayStr });
      await triggerDailyAggregation(todayStr);
      setClosingStatus("Success! Accounting cycle closed. Narrative & PDF reports delivered.");
      await loadData();
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to close accounting cycle early.");
    } finally {
      setClosing(false);
      setTimeout(() => setClosingStatus(null), 5000);
    }
  };

  const handleUpdateCycleDates = async (cycleId: string) => {
    if (!isOwnerOrAdmin) return;
    setSubmitting(true);
    try {
      await updateAccountingCycle(cycleId, {
        start_date: adjustStartDate,
        end_date: adjustEndDate,
      });
      setAdjustingCycleId(null);
      await loadData();
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to update cycle dates.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCycle = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setError(null);
    setSubmitting(true);

    const parsedBbf = parseFloat(bbf);
    if (isNaN(parsedBbf) || parsedBbf < 0) {
      setError("Balance brought forward must be at least 0.");
      setSubmitting(false);
      return;
    }

    try {
      const newCycle = await createAccountingCycle({
        business_id: businessId,
        period_type: periodType,
        start_date: startDate,
        end_date: endDate,
        balance_brought_forward: parsedBbf,
      });

      setOpenCycles((prev) => [newCycle, ...prev]);
      setSalesCycleId(newCycle.id);
      setPurchasesCycleId(newCycle.id);
    } catch (err: unknown) {
      setError("Failed to open accounting cycle.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === "other") {
      setCustomItemName("");
      setPricePerUnit("");
    } else {
      const product = products.find((p) => p.id === prodId);
      if (product) {
        setCustomItemName(product.name);
        setPricePerUnit(product.default_price.toString());
      }
    }
  };

  const handlePurchaseProductChange = (prodId: string) => {
    setPurchaseProductId(prodId);
    if (prodId === "other") {
      setPurchaseCustomItemName("");
      setPurchasePricePerUnit("");
    } else {
      const product = products.find((p) => p.id === prodId);
      if (product) {
        setPurchaseCustomItemName(product.name);
        setPurchasePricePerUnit(product.default_price.toString());
      }
    }
  };

  const handleLogSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessId || !user) return;
    setError(null);
    setSubmitting(true);

    const qty = parseFloat(quantity);
    const price = parseFloat(pricePerUnit);
    const disc = parseFloat(discount);

    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0.");
      setSubmitting(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setError("Price per unit must be greater than or equal to 0.");
      setSubmitting(false);
      return;
    }
    if (isNaN(disc) || disc < 0) {
      setError("Discount must be greater than or equal to 0.");
      setSubmitting(false);
      return;
    }

    try {
      await createSale({
        business_id: businessId,
        user_id: user.id,
        cycle_id: salesCycleId,
        product_id: selectedProductId === "other" ? null : selectedProductId,
        item_name: customItemName,
        customer_details: customerDetails || null,
        quantity: qty,
        price_per_unit: price,
        discount: disc,
        payment_type: paymentType,
      });

      const updatedSales = await fetchSales(businessId);
      setSales(updatedSales);

      // Reset form
      setSelectedProductId("");
      setCustomItemName("");
      setQuantity("1");
      setPricePerUnit("");
      setDiscount("0");
      setCustomerDetails("");
      setPaymentType("cash");
    } catch (err: unknown) {
      setError("Failed to record sale transaction.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogPurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessId || !user) return;
    setError(null);
    setSubmitting(true);

    const qty = parseFloat(purchaseQuantity);
    const price = parseFloat(purchasePricePerUnit);

    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0.");
      setSubmitting(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setError("Price per unit must be greater than or equal to 0.");
      setSubmitting(false);
      return;
    }

    try {
      await createPurchase({
        business_id: businessId,
        user_id: user.id,
        cycle_id: purchasesCycleId,
        product_id: purchaseProductId === "other" ? null : purchaseProductId,
        item_name: purchaseCustomItemName,
        vendor_details: vendorDetails || null,
        quantity: qty,
        price_per_unit: price,
      });

      const updatedPurchases = await fetchPurchases(businessId);
      setPurchases(updatedPurchases);

      // Reset form
      setPurchaseProductId("");
      setPurchaseCustomItemName("");
      setPurchaseQuantity("1");
      setPurchasePricePerUnit("");
      setVendorDetails("");
    } catch (err: unknown) {
      setError("Failed to record purchase transaction.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived filtered lists ─────────────────────────────────────────────────
  const filteredSales = sales.filter((s) => {
    const matchesProduct = !filterProduct || s.item_name.toLowerCase().includes(filterProduct.toLowerCase());
    const matchesCustomer = !filterDetail || (s.customer_details && s.customer_details.toLowerCase().includes(filterDetail.toLowerCase()));
    const date = new Date(s.created_at);
    const matchesStart = !filterStartDate || date >= new Date(filterStartDate);
    const matchesEnd = !filterEndDate || date <= new Date(filterEndDate + "T23:59:59");
    return matchesProduct && matchesCustomer && matchesStart && matchesEnd;
  });

  const filteredPurchases = purchases.filter((p) => {
    const matchesProduct = !filterProduct || p.item_name.toLowerCase().includes(filterProduct.toLowerCase());
    const matchesVendor = !filterDetail || (p.vendor_details && p.vendor_details.toLowerCase().includes(filterDetail.toLowerCase()));
    const date = new Date(p.created_at);
    const matchesStart = !filterStartDate || date >= new Date(filterStartDate);
    const matchesEnd = !filterEndDate || date <= new Date(filterEndDate + "T23:59:59");
    return matchesProduct && matchesVendor && matchesStart && matchesEnd;
  });

  // ── Render gates ───────────────────────────────────────────────────────────
  if (loading) return <PageLoader />;

  if (openCycles.length === 0) {
    return (
      <NoCycleGate
        isOwnerOrAdmin={!!isOwnerOrAdmin}
        error={error}
        submitting={submitting}
        periodType={periodType}
        setPeriodType={setPeriodType}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        bbf={bbf}
        setBbf={setBbf}
        onSubmit={handleOpenCycle}
      />
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left column — forms + cycle control */}
      <div className="space-y-4">
        <TabToggle active={activeTab} onChange={setActiveTab} />

        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          {/* Accent stripe */}
          <div className="h-0.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
          <div className="p-6">
            <ErrorBanner message={error ?? ""} className="mb-4" />

            {!canLog ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Your role does not allow logging transactions.
              </p>
            ) : activeTab === "sales" ? (
              <SaleForm
                products={products}
                openCycles={openCycles}
                isOwnerOrAdmin={!!isOwnerOrAdmin}
                submitting={submitting}
                onSubmit={handleLogSale}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                customItemName={customItemName}
                setCustomItemName={setCustomItemName}
                quantity={quantity}
                setQuantity={setQuantity}
                pricePerUnit={pricePerUnit}
                setPricePerUnit={setPricePerUnit}
                discount={discount}
                setDiscount={setDiscount}
                customerDetails={customerDetails}
                setCustomerDetails={setCustomerDetails}
                paymentType={paymentType}
                setPaymentType={setPaymentType}
                salesCycleId={salesCycleId}
                setSalesCycleId={setSalesCycleId}
                onProductChange={handleProductChange}
              />
            ) : (
              <PurchaseForm
                products={products}
                openCycles={openCycles}
                isOwnerOrAdmin={!!isOwnerOrAdmin}
                submitting={submitting}
                onSubmit={handleLogPurchase}
                purchaseProductId={purchaseProductId}
                purchaseCustomItemName={purchaseCustomItemName}
                setPurchaseCustomItemName={setPurchaseCustomItemName}
                purchaseQuantity={purchaseQuantity}
                setPurchaseQuantity={setPurchaseQuantity}
                purchasePricePerUnit={purchasePricePerUnit}
                setPurchasePricePerUnit={setPurchasePricePerUnit}
                vendorDetails={vendorDetails}
                setVendorDetails={setVendorDetails}
                purchasesCycleId={purchasesCycleId}
                setPurchasesCycleId={setPurchasesCycleId}
                onProductChange={handlePurchaseProductChange}
              />
            )}
          </div>
        </div>

        <CycleControlCard
          cycles={openCycles}
          isOwnerOrAdmin={!!isOwnerOrAdmin}
          closing={closing}
          closingStatus={closingStatus}
          adjustingCycleId={adjustingCycleId}
          adjustStartDate={adjustStartDate}
          adjustEndDate={adjustEndDate}
          setAdjustingCycleId={setAdjustingCycleId}
          setAdjustStartDate={setAdjustStartDate}
          setAdjustEndDate={setAdjustEndDate}
          onCloseCycle={handleCloseCycleEarly}
          onUpdateDates={handleUpdateCycleDates}
        />
      </div>

      {/* Right two columns — filters + history */}
      <div className="lg:col-span-2 space-y-4">
        <FilterBar
          activeTab={activeTab}
          filterProduct={filterProduct}
          setFilterProduct={setFilterProduct}
          filterDetail={filterDetail}
          setFilterDetail={setFilterDetail}
          filterStartDate={filterStartDate}
          setFilterStartDate={setFilterStartDate}
          filterEndDate={filterEndDate}
          setFilterEndDate={setFilterEndDate}
        />

        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/25 flex items-center justify-between">
            <h3 className="font-semibold text-base">
              {activeTab === "sales" ? "Sales Transactions" : "Purchase Transactions"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {activeTab === "sales" ? filteredSales.length : filteredPurchases.length} record
              {(activeTab === "sales" ? filteredSales.length : filteredPurchases.length) !== 1 ? "s" : ""}
            </span>
          </div>
          <TransactionTable
            mode={activeTab}
            sales={filteredSales}
            purchases={filteredPurchases}
          />
        </div>
      </div>
    </div>
  );
}

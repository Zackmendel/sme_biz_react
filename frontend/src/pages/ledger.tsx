import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import {
  fetchOpenCycles,
  createAccountingCycle,
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
import { Loader2, Calendar, AlertCircle, ShoppingCart, ShoppingBag, Filter } from "lucide-react";

export function LedgerPage() {
  const { profile, user } = useAuth();

  // State
  const [openCycles, setOpenCycles] = useState<AccountingCycle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"sales" | "purchases">("sales");

  // Cycle creation form
  const [periodType, setPeriodType] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bbf, setBbf] = useState("0");

  // Sales Form States
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customItemName, setCustomItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [discount, setDiscount] = useState("0");
  const [customerDetails, setCustomerDetails] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "transfer" | "card" | "credit">("cash");
  const [salesCycleId, setSalesCycleId] = useState("");

  // Purchases Form States
  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseCustomItemName, setPurchaseCustomItemName] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchasePricePerUnit, setPurchasePricePerUnit] = useState("");
  const [vendorDetails, setVendorDetails] = useState("");
  const [purchasesCycleId, setPurchasesCycleId] = useState("");

  // List filter states
  const [filterProduct, setFilterProduct] = useState("");
  const [filterDetail, setFilterDetail] = useState(""); // customer/vendor
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const businessId = profile?.business_id;

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

      // Auto-set default cycle ID
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

  // Handle opening a new cycle (Balance Brought Forward flow)
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

  // Pre-fill price when product changes
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

  // Pre-fill price for purchases
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

  // Handle logging a sale
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

      // Reload sales to get server computed totals
      const updatedSales = await fetchSales(businessId);
      setSales(updatedSales);

      // Reset form
      setSelectedProductId("");
      setCustomItemName("");
      setQuantity("");
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

  // Handle logging a purchase
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

      // Reload purchases
      const updatedPurchases = await fetchPurchases(businessId);
      setPurchases(updatedPurchases);

      // Reset form
      setPurchaseProductId("");
      setPurchaseCustomItemName("");
      setPurchaseQuantity("");
      setPurchasePricePerUnit("");
      setVendorDetails("");
    } catch (err: unknown) {
      setError("Failed to record purchase transaction.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering lists
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

  // Roles permissions
  const isOwnerOrAdmin = profile?.role && ["owner", "admin"].includes(profile.role);
  const canLog = profile?.role && ["owner", "admin", "staff"].includes(profile.role);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Gatekeeper Mode: If no active open cycles exist
  if (openCycles.length === 0) {
    return (
      <div className="max-w-md mx-auto space-y-6 pt-12">
        <div className="flex flex-col items-center justify-center text-center p-6 bg-card border border-border rounded-2xl shadow-xl">
          <Calendar className="h-12 w-12 text-primary mb-4" />
          <h2 className="text-xl font-bold tracking-tight">No Open Accounting Cycle</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You need to open a cycle before entering sales or purchases.
          </p>

          {isOwnerOrAdmin ? (
            <form onSubmit={handleOpenCycle} className="w-full text-left space-y-4 mt-6">
              {/* Period Type */}
              <div className="space-y-1">
                <label htmlFor="cycle-period" className="text-xs font-medium text-muted-foreground">
                  Period Type
                </label>
                <select
                  id="cycle-period"
                  value={periodType}
                  onChange={(e) => setPeriodType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="cycle-start" className="text-xs font-medium text-muted-foreground">
                    Start Date
                  </label>
                  <input
                    id="cycle-start"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="cycle-end" className="text-xs font-medium text-muted-foreground">
                    End Date
                  </label>
                  <input
                    id="cycle-end"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Balance Brought Forward */}
              <div className="space-y-1">
                <label htmlFor="cycle-bbf" className="text-xs font-medium text-muted-foreground">
                  Balance Brought Forward (₦)
                </label>
                <input
                  id="cycle-bbf"
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  value={bbf}
                  onChange={(e) => setBbf(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 text-sm focus:outline-none"
                />
              </div>

              {error && (
                <div className="text-xs text-destructive flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex h-10 items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all text-sm mt-4"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm & Open Cycle
              </button>
            </form>
          ) : (
            <div className="mt-6 flex items-start gap-2 bg-secondary/30 p-4 border border-border/40 rounded-xl text-left">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs text-muted-foreground leading-normal">
                Please contact your business Owner or Admin to open an accounting cycle so you can log sales and purchases.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Forms Section (Left Column) */}
      <div className="space-y-6">
        {/* Tab Toggle */}
        <div className="flex border border-border/80 bg-card rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex-1 flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg transition-all ${
              activeTab === "sales"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            Log Sale
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`flex-1 flex items-center justify-center gap-2 h-10 text-sm font-medium rounded-lg transition-all ${
              activeTab === "purchases"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Log Purchase
          </button>
        </div>

        {/* Action Panel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-md">
          {error && (
            <div className="mb-4 text-xs text-destructive flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!canLog ? (
            <p className="text-sm text-muted-foreground text-center">
              Your role does not allow logging transactions.
            </p>
          ) : activeTab === "sales" ? (
            /* Log Sale Form */
            <form onSubmit={handleLogSale} className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Record a Sale
              </h2>

              {/* Product Select */}
              <div className="space-y-1">
                <label htmlFor="sale-prod" className="text-xs font-medium text-muted-foreground">
                  Product
                </label>
                <select
                  id="sale-prod"
                  required
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₦{p.default_price})
                    </option>
                  ))}
                  <option value="other">Other / Custom Item</option>
                </select>
              </div>

              {/* Custom Item Name (shown if 'other' chosen or always editable) */}
              {selectedProductId === "other" && (
                <div className="space-y-1">
                  <label htmlFor="sale-item" className="text-xs font-medium text-muted-foreground">
                    Item Name *
                  </label>
                  <input
                    id="sale-item"
                    type="text"
                    required
                    placeholder="e.g. Pure Water Box"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1">
                <label htmlFor="sale-qty" className="text-xs font-medium text-muted-foreground">
                  Quantity *
                </label>
                <input
                  id="sale-qty"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                />
              </div>

              {/* Price per unit */}
              <div className="space-y-1">
                <label htmlFor="sale-price" className="text-xs font-medium text-muted-foreground">
                  Price per Unit (₦) *
                </label>
                <input
                  id="sale-price"
                  type="number"
                  step="0.01"
                  required
                  disabled={!isOwnerOrAdmin}
                  placeholder="0.00"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
                {!isOwnerOrAdmin && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Only owners and admins can edit preset default prices.
                  </p>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-1">
                <label htmlFor="sale-disc" className="text-xs font-medium text-muted-foreground">
                  Discount (₦)
                </label>
                <input
                  id="sale-disc"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                />
              </div>

              {/* Customer Details */}
              <div className="space-y-1">
                <label htmlFor="sale-cust" className="text-xs font-medium text-muted-foreground">
                  Customer Details (Optional)
                </label>
                <input
                  id="sale-cust"
                  type="text"
                  placeholder="e.g. Alao Musa"
                  value={customerDetails}
                  onChange={(e) => setCustomerDetails(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                />
              </div>

              {/* Payment Type */}
              <div className="space-y-1">
                <label htmlFor="sale-payment" className="text-xs font-medium text-muted-foreground">
                  Payment Type
                </label>
                <select
                  id="sale-payment"
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                  <option value="credit">Store Credit</option>
                </select>
              </div>

              {/* Cycle Resolver (if multiple open cycles) */}
              {openCycles.length > 1 && (
                <div className="space-y-1">
                  <label htmlFor="sale-cycle" className="text-xs font-medium text-muted-foreground">
                    Accounting Cycle
                  </label>
                  <select
                    id="sale-cycle"
                    value={salesCycleId}
                    onChange={(e) => setSalesCycleId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                  >
                    {openCycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.period_type.toUpperCase()} ({c.start_date} - {c.end_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex h-10 items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all text-sm pt-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Sale
              </button>
            </form>
          ) : (
            /* Log Purchase Form */
            <form onSubmit={handleLogPurchase} className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Record a Purchase
              </h2>

              {/* Product Select */}
              <div className="space-y-1">
                <label htmlFor="purch-prod" className="text-xs font-medium text-muted-foreground">
                  Product
                </label>
                <select
                  id="purch-prod"
                  required
                  value={purchaseProductId}
                  onChange={(e) => handlePurchaseProductChange(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="other">Other / Custom Item</option>
                </select>
              </div>

              {/* Custom Item Name */}
              {purchaseProductId === "other" && (
                <div className="space-y-1">
                  <label htmlFor="purch-item" className="text-xs font-medium text-muted-foreground">
                    Item Name *
                  </label>
                  <input
                    id="purch-item"
                    type="text"
                    required
                    placeholder="e.g. Plastic Chairs Box"
                    value={purchaseCustomItemName}
                    onChange={(e) => setPurchaseCustomItemName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1">
                <label htmlFor="purch-qty" className="text-xs font-medium text-muted-foreground">
                  Quantity *
                </label>
                <input
                  id="purch-qty"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="1"
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                />
              </div>

              {/* Price per unit */}
              <div className="space-y-1">
                <label htmlFor="purch-price" className="text-xs font-medium text-muted-foreground">
                  Price per Unit (₦) *
                </label>
                <input
                  id="purch-price"
                  type="number"
                  step="0.01"
                  required
                  disabled={!isOwnerOrAdmin}
                  placeholder="0.00"
                  value={purchasePricePerUnit}
                  onChange={(e) => setPurchasePricePerUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
                {!isOwnerOrAdmin && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Only owners and admins can edit preset default prices.
                  </p>
                )}
              </div>

              {/* Vendor Details */}
              <div className="space-y-1">
                <label htmlFor="purch-vendor" className="text-xs font-medium text-muted-foreground">
                  Vendor Details (Optional)
                </label>
                <input
                  id="purch-vendor"
                  type="text"
                  placeholder="e.g. Dangote Distributors"
                  value={vendorDetails}
                  onChange={(e) => setVendorDetails(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                />
              </div>

              {/* Cycle Resolver */}
              {openCycles.length > 1 && (
                <div className="space-y-1">
                  <label htmlFor="purch-cycle" className="text-xs font-medium text-muted-foreground">
                    Accounting Cycle
                  </label>
                  <select
                    id="purch-cycle"
                    value={purchasesCycleId}
                    onChange={(e) => setPurchasesCycleId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm focus:outline-none"
                  >
                    {openCycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.period_type.toUpperCase()} ({c.start_date} - {c.end_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex h-10 items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all text-sm pt-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Submit Purchase
              </button>
            </form>
          )}
        </div>
      </div>

      {/* History Lists Section (Right 2 Columns) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Filters */}
        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Filter Ledger History</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Filter by product */}
            <div className="space-y-1">
              <label htmlFor="filter-prod" className="text-[11px] font-medium text-muted-foreground">
                Item Name
              </label>
              <input
                id="filter-prod"
                type="text"
                placeholder="Search item..."
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Filter by Detail (Customer/Vendor) */}
            <div className="space-y-1">
              <label htmlFor="filter-detail" className="text-[11px] font-medium text-muted-foreground">
                {activeTab === "sales" ? "Customer" : "Vendor"}
              </label>
              <input
                id="filter-detail"
                type="text"
                placeholder={activeTab === "sales" ? "Search customer..." : "Search vendor..."}
                value={filterDetail}
                onChange={(e) => setFilterDetail(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label htmlFor="filter-start" className="text-[11px] font-medium text-muted-foreground">
                Start Date
              </label>
              <input
                id="filter-start"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 text-xs text-foreground focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label htmlFor="filter-end" className="text-[11px] font-medium text-muted-foreground">
                End Date
              </label>
              <input
                id="filter-end"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-secondary/20 px-3 text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Ledger List */}
        <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-secondary/25">
            <h3 className="font-semibold text-base">
              {activeTab === "sales" ? "Sales Transactions" : "Purchases Transactions"}
            </h3>
          </div>

          {activeTab === "sales" ? (
            /* Sales Table */
            filteredSales.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No sales transactions logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-secondary/15 font-medium text-muted-foreground">
                      <th className="p-4">Date</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Discount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="p-4 text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString("en-NG")}
                        </td>
                        <td className="p-4 font-medium text-foreground">{sale.item_name}</td>
                        <td className="p-4 text-muted-foreground">{sale.customer_details || "—"}</td>
                        <td className="p-4 text-foreground">{sale.quantity}</td>
                        <td className="p-4 text-foreground">
                          ₦{sale.price_per_unit.toLocaleString("en-NG")}
                        </td>
                        <td className="p-4 text-destructive">
                          {sale.discount > 0 ? `-₦${sale.discount.toLocaleString("en-NG")}` : "—"}
                        </td>
                        <td className="p-4">
                          <span className="capitalize px-2 py-0.5 text-[11px] font-medium border border-border/60 rounded bg-secondary/50">
                            {sale.payment_type}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-emerald-400">
                          ₦{sale.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Purchases Table */
            filteredPurchases.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">No purchases transactions logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-secondary/15 font-medium text-muted-foreground">
                      <th className="p-4">Date</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Price</th>
                      <th className="p-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPurchases.map((purch) => (
                      <tr key={purch.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="p-4 text-muted-foreground">
                          {new Date(purch.created_at).toLocaleDateString("en-NG")}
                        </td>
                        <td className="p-4 font-medium text-foreground">{purch.item_name}</td>
                        <td className="p-4 text-muted-foreground">{purch.vendor_details || "—"}</td>
                        <td className="p-4 text-foreground">{purch.quantity}</td>
                        <td className="p-4 text-foreground">
                          ₦{purch.price_per_unit.toLocaleString("en-NG")}
                        </td>
                        <td className="p-4 text-right font-semibold text-foreground">
                          ₦{purch.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

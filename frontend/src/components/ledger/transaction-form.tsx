import type { FormEvent } from "react";
import { Loader2, ShoppingCart, ShoppingBag } from "lucide-react";
import type { Product, AccountingCycle } from "@/lib/supabase-data";
import { FormField } from "./form-field";
import { FormInput, FormSelect } from "./form-input";

// ---------------------------------------------------------------------------
// Shared SubmitButton
// ---------------------------------------------------------------------------

function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full flex h-10 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all text-sm mt-2"
    >
      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Cycle resolver (shown only when > 1 open cycle)
// ---------------------------------------------------------------------------

function CycleSelect({
  id,
  cycles,
  value,
  onChange,
}: {
  id: string;
  cycles: AccountingCycle[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (cycles.length <= 1) return null;
  return (
    <FormField id={id} label="Accounting Cycle">
      <FormSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.period_type.toUpperCase()} ({c.start_date} — {c.end_date})
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}

// ---------------------------------------------------------------------------
// SaleForm
// ---------------------------------------------------------------------------

export interface SaleFormProps {
  products: Product[];
  openCycles: AccountingCycle[];
  isOwnerOrAdmin: boolean;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;

  selectedProductId: string;
  setSelectedProductId: (v: string) => void;
  customItemName: string;
  setCustomItemName: (v: string) => void;
  quantity: string;
  setQuantity: (v: string) => void;
  pricePerUnit: string;
  setPricePerUnit: (v: string) => void;
  discount: string;
  setDiscount: (v: string) => void;
  customerDetails: string;
  setCustomerDetails: (v: string) => void;
  paymentType: "cash" | "transfer" | "card" | "credit";
  setPaymentType: (v: "cash" | "transfer" | "card" | "credit") => void;
  salesCycleId: string;
  setSalesCycleId: (v: string) => void;
  onProductChange: (prodId: string) => void;
}

export function SaleForm({
  products,
  openCycles,
  isOwnerOrAdmin,
  submitting,
  onSubmit,
  selectedProductId,
  customItemName,
  setCustomItemName,
  quantity,
  setQuantity,
  pricePerUnit,
  setPricePerUnit,
  discount,
  setDiscount,
  customerDetails,
  setCustomerDetails,
  paymentType,
  setPaymentType,
  salesCycleId,
  setSalesCycleId,
  onProductChange,
}: SaleFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        Record a Sale
      </h2>

      {/* Product */}
      <FormField id="sale-prod" label="Product">
        <FormSelect
          id="sale-prod"
          required
          value={selectedProductId}
          onChange={(e) => onProductChange(e.target.value)}
        >
          <option value="">— Select Product —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (₦{p.default_price})
            </option>
          ))}
          <option value="other">Other / Custom Item</option>
        </FormSelect>
      </FormField>

      {/* Custom item name — only when "other" chosen */}
      {selectedProductId === "other" && (
        <FormField id="sale-item" label="Item Name *">
          <FormInput
            id="sale-item"
            type="text"
            required
            placeholder="e.g. Pure Water Box"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
          />
        </FormField>
      )}

      {/* Quantity + Price side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <FormField id="sale-qty" label="Quantity *">
          <FormInput
            id="sale-qty"
            type="number"
            step="0.01"
            required
            min="0.01"
            placeholder="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>

        <FormField
          id="sale-price"
          label="Price / Unit (₦) *"
          hint={
            !isOwnerOrAdmin
              ? "Only owners and admins can edit preset prices."
              : undefined
          }
        >
          <FormInput
            id="sale-price"
            type="number"
            step="0.01"
            required
            disabled={!isOwnerOrAdmin}
            placeholder="0.00"
            value={pricePerUnit}
            onChange={(e) => setPricePerUnit(e.target.value)}
          />
        </FormField>
      </div>

      {/* Discount */}
      <FormField id="sale-disc" label="Discount (₦)">
        <FormInput
          id="sale-disc"
          type="number"
          step="0.01"
          placeholder="0"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </FormField>

      {/* Customer */}
      <FormField id="sale-cust" label="Customer Details (Optional)">
        <FormInput
          id="sale-cust"
          type="text"
          placeholder="e.g. Alao Musa"
          value={customerDetails}
          onChange={(e) => setCustomerDetails(e.target.value)}
        />
      </FormField>

      {/* Payment type */}
      <FormField id="sale-payment" label="Payment Type">
        <FormSelect
          id="sale-payment"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value as SaleFormProps["paymentType"])}
        >
          <option value="cash">Cash</option>
          <option value="transfer">Bank Transfer</option>
          <option value="card">Card</option>
          <option value="credit">Store Credit</option>
        </FormSelect>
      </FormField>

      <CycleSelect
        id="sale-cycle"
        cycles={openCycles}
        value={salesCycleId}
        onChange={setSalesCycleId}
      />

      <SubmitButton submitting={submitting} label="Submit Sale" />
    </form>
  );
}

// ---------------------------------------------------------------------------
// PurchaseForm
// ---------------------------------------------------------------------------

export interface PurchaseFormProps {
  products: Product[];
  openCycles: AccountingCycle[];
  isOwnerOrAdmin: boolean;
  submitting: boolean;
  onSubmit: (e: FormEvent) => void;

  purchaseProductId: string;
  purchaseCustomItemName: string;
  setPurchaseCustomItemName: (v: string) => void;
  purchaseQuantity: string;
  setPurchaseQuantity: (v: string) => void;
  purchasePricePerUnit: string;
  setPurchasePricePerUnit: (v: string) => void;
  vendorDetails: string;
  setVendorDetails: (v: string) => void;
  purchasesCycleId: string;
  setPurchasesCycleId: (v: string) => void;
  onProductChange: (prodId: string) => void;
}

export function PurchaseForm({
  products,
  openCycles,
  isOwnerOrAdmin,
  submitting,
  onSubmit,
  purchaseProductId,
  purchaseCustomItemName,
  setPurchaseCustomItemName,
  purchaseQuantity,
  setPurchaseQuantity,
  purchasePricePerUnit,
  setPurchasePricePerUnit,
  vendorDetails,
  setVendorDetails,
  purchasesCycleId,
  setPurchasesCycleId,
  onProductChange,
}: PurchaseFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        Record a Purchase
      </h2>

      {/* Product */}
      <FormField id="purch-prod" label="Product">
        <FormSelect
          id="purch-prod"
          required
          value={purchaseProductId}
          onChange={(e) => onProductChange(e.target.value)}
        >
          <option value="">— Select Product —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="other">Other / Custom Item</option>
        </FormSelect>
      </FormField>

      {/* Custom item name */}
      {purchaseProductId === "other" && (
        <FormField id="purch-item" label="Item Name *">
          <FormInput
            id="purch-item"
            type="text"
            required
            placeholder="e.g. Plastic Chairs Box"
            value={purchaseCustomItemName}
            onChange={(e) => setPurchaseCustomItemName(e.target.value)}
          />
        </FormField>
      )}

      {/* Quantity + Price side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <FormField id="purch-qty" label="Quantity *">
          <FormInput
            id="purch-qty"
            type="number"
            step="0.01"
            required
            min="0.01"
            placeholder="1"
            value={purchaseQuantity}
            onChange={(e) => setPurchaseQuantity(e.target.value)}
          />
        </FormField>

        <FormField
          id="purch-price"
          label="Price / Unit (₦) *"
          hint={
            !isOwnerOrAdmin
              ? "Only owners and admins can edit preset prices."
              : undefined
          }
        >
          <FormInput
            id="purch-price"
            type="number"
            step="0.01"
            required
            disabled={!isOwnerOrAdmin}
            placeholder="0.00"
            value={purchasePricePerUnit}
            onChange={(e) => setPurchasePricePerUnit(e.target.value)}
          />
        </FormField>
      </div>

      {/* Vendor */}
      <FormField id="purch-vendor" label="Vendor Details (Optional)">
        <FormInput
          id="purch-vendor"
          type="text"
          placeholder="e.g. Dangote Distributors"
          value={vendorDetails}
          onChange={(e) => setVendorDetails(e.target.value)}
        />
      </FormField>

      <CycleSelect
        id="purch-cycle"
        cycles={openCycles}
        value={purchasesCycleId}
        onChange={setPurchasesCycleId}
      />

      <SubmitButton submitting={submitting} label="Submit Purchase" />
    </form>
  );
}

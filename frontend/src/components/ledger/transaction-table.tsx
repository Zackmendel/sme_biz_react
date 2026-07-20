import type { Sale, Purchase } from "@/lib/supabase-data";

// ---------------------------------------------------------------------------
// Shared table shell
// ---------------------------------------------------------------------------

function TableShell({
  headers,
  children,
}: {
  headers: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/20">
            {headers.map((h, i) => (
              <th key={i} className="p-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">{children}</tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment type badge
// ---------------------------------------------------------------------------

function PaymentBadge({ type }: { type: string }) {
  return (
    <span className="capitalize px-2 py-0.5 text-[11px] font-medium border border-border/60 rounded bg-secondary/50">
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyRows({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2">
      <div className="h-10 w-10 rounded-full bg-secondary/60 flex items-center justify-center">
        <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sales Table
// ---------------------------------------------------------------------------

function SalesTable({ rows }: { rows: Sale[] }) {
  if (rows.length === 0) return <EmptyRows label="No sales transactions logged." />;

  return (
    <TableShell
      headers={["Date", "Item Name", "Customer", "Qty", "Price", "Discount", "Payment", <span className="block text-right">Total</span>]}
    >
      {rows.map((sale) => (
        <tr key={sale.id} className="hover:bg-secondary/10 transition-colors group border-l-2 border-l-transparent hover:border-l-primary/40">
          <td className="p-4 text-muted-foreground">
            {new Date(sale.created_at).toLocaleDateString("en-NG")}
          </td>
          <td className="p-4 font-medium text-foreground">{sale.item_name}</td>
          <td className="p-4 text-muted-foreground">{sale.customer_details || "—"}</td>
          <td className="p-4 text-foreground">{sale.quantity}</td>
          <td className="p-4 text-foreground">₦{sale.price_per_unit.toLocaleString("en-NG")}</td>
          <td className="p-4 text-destructive">
            {sale.discount > 0 ? `-₦${sale.discount.toLocaleString("en-NG")}` : "—"}
          </td>
          <td className="p-4">
            <PaymentBadge type={sale.payment_type} />
          </td>
          <td className="p-4 text-right font-semibold text-emerald-400">
            ₦{sale.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------------------------------------------------------------------------
// Purchases Table
// ---------------------------------------------------------------------------

function PurchasesTable({ rows }: { rows: Purchase[] }) {
  if (rows.length === 0) return <EmptyRows label="No purchase transactions logged." />;

  return (
    <TableShell
      headers={["Date", "Item Name", "Vendor", "Qty", "Price", <span className="block text-right">Total</span>]}
    >
      {rows.map((purch) => (
        <tr key={purch.id} className="hover:bg-secondary/10 transition-colors group border-l-2 border-l-transparent hover:border-l-primary/40">
          <td className="p-4 text-muted-foreground">
            {new Date(purch.created_at).toLocaleDateString("en-NG")}
          </td>
          <td className="p-4 font-medium text-foreground">{purch.item_name}</td>
          <td className="p-4 text-muted-foreground">{purch.vendor_details || "—"}</td>
          <td className="p-4 text-foreground">{purch.quantity}</td>
          <td className="p-4 text-foreground">₦{purch.price_per_unit.toLocaleString("en-NG")}</td>
          <td className="p-4 text-right font-semibold text-foreground">
            ₦{purch.total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

// ---------------------------------------------------------------------------
// Public export — single component that switches on mode
// ---------------------------------------------------------------------------

interface TransactionTableProps {
  mode: "sales" | "purchases";
  sales?: Sale[];
  purchases?: Purchase[];
}

export function TransactionTable({ mode, sales = [], purchases = [] }: TransactionTableProps) {
  return mode === "sales" ? (
    <SalesTable rows={sales} />
  ) : (
    <PurchasesTable rows={purchases} />
  );
}

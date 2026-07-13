import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { fetchProducts, createProduct, updateProduct, type Product } from "@/lib/supabase-data";
import { Loader2, Plus, Search, Archive, ArchiveRestore, Package } from "lucide-react";

export function ProductsPage() {
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const businessId = profile?.business_id;

  const loadProductsList = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await fetchProducts(businessId);
      setProducts(data);
    } catch (err: unknown) {
      setError("Failed to fetch products.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductsList();
  }, [businessId]);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setError(null);
    setSubmitting(true);

    const parsedPrice = parseFloat(defaultPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError("Price must be a valid number greater than or equal to 0.");
      setSubmitting(false);
      return;
    }

    try {
      const newProd = await createProduct({
        business_id: businessId,
        name,
        default_price: parsedPrice,
        unit: unit || null,
        category: category || null,
        is_archived: false,
      });

      setProducts((prev) => [newProd, ...prev]);
      // Reset form
      setName("");
      setDefaultPrice("");
      setUnit("");
      setCategory("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setError("Failed to create product.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (product: Product) => {
    setError(null);
    try {
      const updated = await updateProduct(product.id, {
        is_archived: !product.is_archived,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? updated : p))
      );
    } catch (err: unknown) {
      setError("Failed to update product state.");
      console.error(err);
    }
  };

  // Get unique categories for filter
  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean) as string[])];

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesArchive = showArchived ? p.is_archived : !p.is_archived;
    return matchesSearch && matchesCategory && matchesArchive;
  });

  const canEdit = profile?.role && ["owner", "admin"].includes(profile.role);
  const canAdd = profile?.role && ["owner", "admin", "staff"].includes(profile.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Items</h1>
          <p className="text-muted-foreground mt-1">
            Manage the list of items your business buys and sells.
          </p>
        </div>
        {canAdd && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Product Form */}
      {showAddForm && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Product Name */}
              <div className="space-y-1">
                <label htmlFor="prod-name" className="text-xs font-medium text-muted-foreground">
                  Name *
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  placeholder="e.g. Rice Bag"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Default Price */}
              <div className="space-y-1">
                <label htmlFor="prod-price" className="text-xs font-medium text-muted-foreground">
                  Default Price (₦) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground text-sm">₦</span>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="0.00"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-secondary/30 pl-7 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-1">
                <label htmlFor="prod-unit" className="text-xs font-medium text-muted-foreground">
                  Unit (e.g. kg, pcs)
                </label>
                <input
                  id="prod-unit"
                  type="text"
                  placeholder="e.g. kg"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="prod-category" className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <input
                  id="prod-category"
                  type="text"
                  placeholder="e.g. Grains"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-secondary/30 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
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
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between bg-card/40 border border-border/40 p-4 rounded-xl">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-secondary/20 pl-9 pr-4 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-lg border border-input bg-secondary/20 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c !== "all").map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Archive Toggle */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`inline-flex items-center gap-2 h-10 px-4 rounded-lg border transition-colors text-sm font-medium ${
            showArchived
              ? "bg-primary/10 border-primary text-primary"
              : "border-border hover:bg-secondary text-muted-foreground"
          }`}
        >
          <Archive className="h-4 w-4" />
          Show Archived
        </button>
      </div>

      {/* Products Table/List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-xl p-8 bg-card/20">
          <Package className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-foreground font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search filters or add a new product to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/50">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-secondary/40 font-medium text-muted-foreground">
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Default Price</th>
                <th className="p-4">Unit</th>
                {canEdit && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-secondary/15 transition-colors">
                  <td className="p-4 font-medium text-foreground">{prod.name}</td>
                  <td className="p-4 text-muted-foreground">{prod.category || "—"}</td>
                  <td className="p-4 text-foreground font-medium">
                    ₦{prod.default_price.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-muted-foreground">{prod.unit || "—"}</td>
                  {canEdit && (
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleArchive(prod)}
                        className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium border transition-colors ${
                          prod.is_archived
                            ? "border-primary/30 text-primary hover:bg-primary/5"
                            : "border-destructive/30 text-destructive hover:bg-destructive/5"
                        }`}
                      >
                        {prod.is_archived ? (
                          <>
                            <ArchiveRestore className="h-3.5 w-3.5" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

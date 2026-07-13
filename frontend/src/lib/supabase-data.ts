import { supabase } from "./supabase";

/**
 * Direct Supabase table access for CRUD operations.
 * RLS enforces tenant isolation — no manual business_id filtering needed.
 *
 * This file handles Sales, Purchases, Products, Debtors CRUD and
 * daily_summaries dashboard reads. AI chat goes through api.ts instead.
 */

// ---- Types matching the database schema ----

export interface Business {
  id: string;
  name: string;
  owner_name: string | null;
  description: string | null;
  industry: string;
  scale: string;
  phone: string | null;
  email: string | null;
  city: string;
  address: string | null;
  proof_url: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  business_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "owner" | "admin" | "staff" | "viewer";
  status: string | null;
  is_active: boolean;
  created_at: string;
}

// ---- Queries ----

/**
 * Fetch the current user's profile from public.users.
 */
export async function fetchUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // PGRST116 = no rows found — expected for brand-new users before trigger fires
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as UserProfile;
}

/**
 * Fetch a business by ID.
 */
export async function fetchBusiness(
  businessId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Business;
}

/**
 * Create a new business.
 */
export async function createBusiness(
  business: Omit<Business, "created_at">
): Promise<Business> {
  const { error } = await supabase
    .from("businesses")
    .insert(business);

  if (error) throw error;
  return {
    ...business,
    created_at: new Date().toISOString(),
  };
}

/**
 * Update user profile details (e.g. role, business_id).
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, "id" | "created_at">>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

/**
 * Upload a business document to Supabase Storage.
 */
export async function uploadProofDocument(
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const uniqueId = Math.random().toString(36).substring(2, 15);
  const filePath = `proofs/${uniqueId}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("business-documents")
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("business-documents")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Update the proof URL for a business.
 */
export async function updateBusinessProofUrl(
  businessId: string,
  proofUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("businesses")
    .update({ proof_url: proofUrl })
    .eq("id", businessId);

  if (error) throw error;
}

// ---- Product Interface & CRUD ----

export interface Product {
  id: string;
  business_id: string;
  name: string;
  default_price: number;
  unit: string | null;
  category: string | null;
  is_archived: boolean;
}

/**
 * Fetch all products for a business.
 */
export async function fetchProducts(businessId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Product[];
}

/**
 * Create a new product.
 */
export async function createProduct(
  product: Omit<Product, "id">
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

/**
 * Update product details or archive/unarchive.
 */
export async function updateProduct(
  productId: string,
  updates: Partial<Omit<Product, "id" | "business_id">>
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

// ---- Staff Management ----

/**
 * Fetch all users associated with a business (staff list).
 */
export async function fetchStaffMembers(
  businessId: string
): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as UserProfile[];
}

/**
 * Update staff details (role, is_active, status).
 */
export async function updateStaffMember(
  staffId: string,
  updates: Partial<Omit<UserProfile, "id" | "business_id" | "email" | "created_at">>
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", staffId)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

// ---- Accounting Cycles ----

export interface AccountingCycle {
  id: string;
  business_id: string;
  period_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  start_date: string;
  end_date: string;
  balance_brought_forward: number;
  debts_accrued: number;
  is_closed: boolean;
}

/**
 * Fetch all open cycles for a business.
 */
export async function fetchOpenCycles(
  businessId: string
): Promise<AccountingCycle[]> {
  const { data, error } = await supabase
    .from("accounting_cycles")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_closed", false);

  if (error) throw error;
  return data as AccountingCycle[];
}

/**
 * Create/Open a new accounting cycle.
 */
export async function createAccountingCycle(
  cycle: Omit<AccountingCycle, "id" | "is_closed" | "debts_accrued">
): Promise<AccountingCycle> {
  const { data, error } = await supabase
    .from("accounting_cycles")
    .insert({
      ...cycle,
      is_closed: false,
      debts_accrued: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AccountingCycle;
}

// ---- Sales Ledger ----

export interface Sale {
  id: string;
  business_id: string;
  user_id: string;
  cycle_id: string;
  product_id: string | null;
  item_name: string;
  customer_details: string | null;
  quantity: number;
  price_per_unit: number;
  discount: number;
  total: number;
  payment_type: "cash" | "transfer" | "card" | "credit";
  created_at: string;
  is_flagged: boolean;
}

/**
 * Fetch all sales for a business.
 */
export async function fetchSales(businessId: string): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Sale[];
}

/**
 * Log a new sale (omitting total as it's computed server-side).
 */
export async function createSale(
  sale: Omit<Sale, "id" | "total" | "created_at" | "is_flagged">
): Promise<Sale> {
  const { data, error } = await supabase
    .from("sales")
    .insert(sale)
    .select()
    .single();

  if (error) throw error;
  return data as Sale;
}

// ---- Purchases Ledger ----

export interface Purchase {
  id: string;
  business_id: string;
  user_id: string;
  cycle_id: string;
  product_id: string | null;
  item_name: string;
  vendor_details: string | null;
  quantity: number;
  price_per_unit: number;
  total: number;
  created_at: string;
  is_flagged: boolean;
}

/**
 * Fetch all purchases for a business.
 */
export async function fetchPurchases(businessId: string): Promise<Purchase[]> {
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Purchase[];
}

/**
 * Log a new purchase.
 */
export async function createPurchase(
  purchase: Omit<Purchase, "id" | "total" | "created_at" | "is_flagged">
): Promise<Purchase> {
  const { data, error } = await supabase
    .from("purchases")
    .insert(purchase)
    .select()
    .single();

  if (error) throw error;
  return data as Purchase;
}





import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-context";
import { createBusiness, updateUserProfile, uploadProofDocument, updateBusinessProofUrl } from "@/lib/supabase-data";
import { Loader2, Building2, Upload, AlertCircle } from "lucide-react";

export function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("retail");
  const [scale, setScale] = useState("sole_trader");
  const [city, setCity] = useState("Minna");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);

    try {
      // 1. Generate business ID on client and create Business first (without proof_url)
      const businessId = crypto.randomUUID();
      const business = await createBusiness({
        id: businessId,
        name,
        owner_name: ownerName || null,
        description: description || null,
        industry,
        scale,
        phone: phone || null,
        email: email || null,
        city,
        address: address || null,
        proof_url: null,
      });

      // 2. Link user to the business and set role as 'owner'
      // This establishes users.business_id so subsequent Storage RLS policies will pass.
      await updateUserProfile(user.id, {
        business_id: business.id,
        role: "owner",
      });

      // 3. Optional: Upload proof of business document
      if (file) {
        try {
          const proofUrl = await uploadProofDocument(file);
          // Update the business with the uploaded document's URL
          await updateBusinessProofUrl(business.id, proofUrl);
        } catch (uploadErr) {
          console.error("Storage upload failed, proceeding without proof URL:", uploadErr);
          // Do not fail the whole onboarding if only the file upload failed.
        }
      }

      // 4. Refresh Profile state
      await refreshProfile();

      // 5. Redirect to Dashboard
      navigate("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during onboarding.");
      }
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto py-12 px-4">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[400px] w-[400px] rounded-full bg-chart-2/10 blur-[120px]" />

      <div className="relative w-full max-w-2xl">
        {/* Title */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Onboard Your Business</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Register your business to begin tracking your sales, purchases, and ledger.
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border/60 bg-card/85 p-8 shadow-xl shadow-black/20 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Name */}
              <div className="space-y-2">
                <label htmlFor="biz-name" className="text-sm font-medium text-foreground">
                  Business Name *
                </label>
                <input
                  id="biz-name"
                  type="text"
                  required
                  placeholder="e.g. Alaba Electronics Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Owner Name */}
              <div className="space-y-2">
                <label htmlFor="biz-owner" className="text-sm font-medium text-foreground">
                  Owner Name
                </label>
                <input
                  id="biz-owner"
                  type="text"
                  placeholder="e.g. John Obi"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label htmlFor="biz-phone" className="text-sm font-medium text-foreground">
                  Phone Number
                </label>
                <input
                  id="biz-phone"
                  type="tel"
                  placeholder="e.g. +234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="biz-email" className="text-sm font-medium text-foreground">
                  Business Email
                </label>
                <input
                  id="biz-email"
                  type="email"
                  placeholder="e.g. business@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <label htmlFor="biz-industry" className="text-sm font-medium text-foreground">
                  Industry *
                </label>
                <select
                  id="biz-industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="retail">Retail</option>
                  <option value="food_services">Food Services</option>
                  <option value="services">Services</option>
                  <option value="distributors">Distributors</option>
                  <option value="IT">IT</option>
                </select>
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <label htmlFor="biz-scale" className="text-sm font-medium text-foreground">
                  Business Scale *
                </label>
                <select
                  id="biz-scale"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="sole_trader">Sole Trader</option>
                  <option value="micro">Micro Business</option>
                  <option value="small">Small Business</option>
                  <option value="medium">Medium Business</option>
                </select>
              </div>

              {/* City */}
              <div className="space-y-2">
                <label htmlFor="biz-city" className="text-sm font-medium text-foreground">
                  City *
                </label>
                <select
                  id="biz-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  {["Minna", "Suleja", "Bida", "Kontagora", "Lapai", "Mokwa", "New Bussa", "Agaie", "Paiko", "Kagara", "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Kaduna", "Jos", "Ilorin"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label htmlFor="biz-address" className="text-sm font-medium text-foreground">
                  Address
                </label>
                <input
                  id="biz-address"
                  type="text"
                  placeholder="e.g. 12 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="biz-description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <textarea
                id="biz-description"
                rows={3}
                placeholder="Briefly describe what your business does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-secondary/50 p-4 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
              />
            </div>

            {/* File Upload (Proof of Business) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Proof of Business (Optional)
              </label>
              <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-xl bg-secondary/30 p-6 transition-all hover:bg-secondary/40">
                <input
                  type="file"
                  id="biz-proof"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-foreground">
                  {file ? file.name : "Click or drag to upload document"}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  PDF or Images (Max 5MB)
                </span>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 items-center rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="biz-onboard-submit"
              type="submit"
              disabled={submitting}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Complete Onboarding"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

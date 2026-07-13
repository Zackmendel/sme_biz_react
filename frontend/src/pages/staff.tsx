import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { fetchStaffMembers, updateStaffMember, type UserProfile } from "@/lib/supabase-data";
import { Loader2, UserPlus, Clipboard, Check, Shield, UserX, UserCheck } from "lucide-react";

export function StaffPage() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite states
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const businessId = profile?.business_id;

  const loadStaffList = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await fetchStaffMembers(businessId);
      setStaff(data);
    } catch (err: unknown) {
      setError("Failed to fetch staff members.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, [businessId]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setError(null);
    try {
      const updated = await updateStaffMember(userId, { role: newRole as any });
      setStaff((prev) => prev.map((s) => (s.id === userId ? updated : s)));
    } catch (err: unknown) {
      setError("Failed to update user role.");
      console.error(err);
    }
  };

  const handleToggleActive = async (member: UserProfile) => {
    setError(null);
    try {
      const updated = await updateStaffMember(member.id, {
        is_active: !member.is_active,
      });
      setStaff((prev) => prev.map((s) => (s.id === member.id ? updated : s)));
    } catch (err: unknown) {
      setError("Failed to update member status.");
      console.error(err);
    }
  };

  const generateInviteLink = () => {
    if (!businessId) return;
    const origin = window.location.origin;
    const link = `${origin}/sign-up?invite_biz=${businessId}&invite_role=${inviteRole}`;
    setInviteLink(link);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwnerOrAdmin = profile?.role && ["owner", "admin"].includes(profile.role);

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "admin":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "staff":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-400 border-neutral-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff & Roles</h1>
        <p className="text-muted-foreground mt-1">
          Manage team members, roles, and invite new staff to your business.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left/Middle: Staff List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card/40 p-6">
            <h2 className="text-lg font-semibold mb-4">Team Members</h2>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {staff.map((member) => {
                  const isSelf = member.id === profile?.id;
                  const canManage = isOwnerOrAdmin && !isSelf && member.role !== "owner";

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {member.first_name || member.last_name
                              ? `${member.first_name || ""} ${member.last_name || ""}`.trim()
                              : "Unnamed User"}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                          <span className={`text-[11px] font-medium border px-2 py-0.5 rounded-full ${getRoleBadgeClass(member.role)}`}>
                            {member.role}
                          </span>
                          {!member.is_active && (
                            <span className="text-[11px] font-medium border border-destructive/20 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                      </div>

                      {/* Management Actions */}
                      {canManage && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {/* Role Select */}
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="h-8 rounded-md border border-input bg-secondary/50 px-2 text-xs text-foreground focus:outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(member)}
                            className={`inline-flex items-center justify-center h-8 w-8 rounded-md border transition-colors ${
                              member.is_active
                                ? "border-destructive/20 text-destructive hover:bg-destructive/10"
                                : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                            title={member.is_active ? "Deactivate User" : "Activate User"}
                          >
                            {member.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Invite link generator */}
        {isOwnerOrAdmin && (
          <div className="rounded-xl border border-border bg-card/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Invite Team Members</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate an invite link with a pre-configured role to send to your staff or admin.
            </p>

            {/* Select Role */}
            <div className="space-y-1.5">
              <label htmlFor="invite-role-select" className="text-xs font-medium text-muted-foreground">
                Assign Role
              </label>
              <select
                id="invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-secondary/40 px-3 text-sm text-foreground focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <button
              onClick={generateInviteLink}
              className="w-full h-10 rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:bg-primary/90 text-sm"
            >
              Generate Invite Link
            </button>

            {inviteLink && (
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex h-9 flex-1 rounded-md border border-input bg-secondary/20 px-3 text-xs text-muted-foreground focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`inline-flex items-center justify-center h-9 w-9 rounded-md border transition-all ${
                      copied
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Link copied! Share it with your invitee.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

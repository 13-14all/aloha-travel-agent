/**
 * AdminUsers.tsx
 *
 * Admin-only page at /admin/users for managing all user accounts.
 * Admins can edit display names and roles for any user.
 * Opens in a new window from the admin feedback panel.
 * Accessible only to users with role="admin".
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Shield, User, Pencil, Check, X, Crown } from "lucide-react";

type UserRow = {
  id: number;
  email: string | null;
  name: string | null;
  displayName: string | null;
  role: "user" | "admin";
  hasChosenName: boolean;
  hasSeenWelcome: boolean;
  createdAt: Date;
  lastSignedIn: Date;
};

function EditableUserRow({ user, currentUserId }: { user: UserRow; currentUserId: number }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(user.displayName ?? user.name ?? "");
  const [roleValue, setRoleValue] = useState<"user" | "admin">(user.role);

  const updateUser = trpc.adminUsers.update.useMutation({
    onSuccess: () => {
      toast.success(`Updated ${nameValue || user.email}`);
      utils.adminUsers.list.invalidate();
      setEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const displayedName = user.displayName || user.name || user.email || `User #${user.id}`;
  const isCurrentUser = user.id === currentUserId;

  const handleSave = () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateUser.mutate({
      userId: user.id,
      displayName: nameValue.trim(),
      role: roleValue,
    });
  };

  const handleCancel = () => {
    setNameValue(user.displayName ?? user.name ?? "");
    setRoleValue(user.role);
    setEditing(false);
  };

  return (
    <div className={`p-4 rounded-2xl border-2 transition-colors ${editing ? "border-teal-300 bg-teal-50" : "border-gray-100 bg-white hover:border-teal-200"}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-sm"
          style={{
            background: user.role === "admin"
              ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
              : "linear-gradient(135deg, #a7f3d0, #38bdf8)",
            color: user.role === "admin" ? "#78350f" : "#0c4a6e",
          }}
        >
          {(user.displayName || user.name || "?")[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Display Name</label>
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="h-10 text-base rounded-xl border-2 border-teal-300"
                  placeholder="Enter display name..."
                  maxLength={64}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-1 block">Role</label>
                <div className="flex gap-2">
                  {(["user", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRoleValue(r)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        roleValue === r
                          ? r === "admin"
                            ? "bg-amber-100 border-amber-400 text-amber-800"
                            : "bg-teal-100 border-teal-400 text-teal-800"
                          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {r === "admin" ? "👑 Admin" : "👤 Member"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateUser.isPending}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {updateUser.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  className="rounded-xl"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-gray-800 truncate">{displayedName}</span>
                  {isCurrentUser && (
                    <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-xs">You</Badge>
                  )}
                  {user.role === "admin" ? (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                      <Crown className="w-3 h-3 mr-1" />Admin
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                      <User className="w-3 h-3 mr-1" />Member
                    </Badge>
                  )}
                  {!user.hasChosenName && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                      Name not set
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-0.5 truncate">{user.email}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Joined {new Date(user.createdAt).toLocaleDateString()} ·
                  Last seen {new Date(user.lastSignedIn).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="rounded-xl flex-shrink-0 border-teal-200 text-teal-700 hover:bg-teal-50"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user, isAuthenticated, loading } = useAuth();

  const { data: users, isLoading } = trpc.adminUsers.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-teal-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-lg">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Access Only</h1>
          <p className="text-gray-500 text-lg">This page is only available to administrators.</p>
          <Button onClick={() => window.close()} className="rounded-xl">Close Window</Button>
        </div>
      </div>
    );
  }

  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;
  const noNameCount = users?.filter((u) => !u.hasChosenName).length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-teal-50 to-sky-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg border border-amber-100 overflow-hidden">
          <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #fbbf24, #34d399, #38bdf8)" }} />
          <div className="px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)" }}
              >
                <Users className="w-6 h-6 text-amber-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Manage Users
                </h1>
                <p className="text-gray-400 text-sm">
                  {users?.length ?? 0} total · {adminCount} admin{adminCount !== 1 ? "s" : ""}
                  {noNameCount > 0 && ` · ${noNameCount} without a display name`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="rounded-xl text-gray-500"
            >
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          </div>
        </div>

        {/* Info banner */}
        {noNameCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-orange-800">
                {noNameCount} user{noNameCount !== 1 ? "s" : ""} haven't chosen a display name yet
              </p>
              <p className="text-orange-600 text-sm mt-0.5">
                You can set names for them here so they appear correctly in the app.
              </p>
            </div>
          </div>
        )}

        {/* User list */}
        <div className="space-y-3">
          {users?.map((u) => (
            <EditableUserRow key={u.id} user={u} currentUserId={user.id} />
          ))}
          {(!users || users.length === 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No users yet. They'll appear here once they sign in.</p>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl px-5 py-4">
          <p className="text-sm text-sky-700">
            <strong>Tip:</strong> To make someone an admin, click Edit next to their name and change their role to Admin.
            Admins can see all change requests, manage users, and have full access to all trips.
          </p>
        </div>

      </div>
    </div>
  );
}

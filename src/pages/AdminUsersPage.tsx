import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import supabase from "@/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type AdminUserRow = {
  user_id: string;
  email: string;
  roles: string[]; // aggregated roles for display; highest precedence used as "current"
};

type RoleOption = {
  id: string;
  role_name: string;
};

export default function AdminUsersPage() {
  const { session } = useSession();
  const navigate = useNavigate();

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const isAdmin = userRoles.includes("admin");

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "volunteer" | "visitor" | "uncategorized">("all");

  useEffect(() => {
    if (!session) {
      navigate("/");
    }
  }, [session, navigate]);

  // Load current viewer roles to gate access
  useEffect(() => {
    const fetchViewerRoles = async () => {
      try {
        if (!session?.user?.id) {
          setUserRoles([]);
          return;
        }
        const { data: ur, error: urErr } = await supabase
          .from("user_roles")
          .select("role_id")
          .eq("user_id", session.user.id);
        if (urErr) {
          console.error("Error fetching viewer roles:", urErr);
          setUserRoles([]);
          return;
        }
        const roleIds = (ur || []).map((r: any) => r.role_id);
        if (!roleIds.length) {
          setUserRoles([]);
          return;
        }
        const { data: rolesRows, error: rErr } = await supabase
          .from("roles")
          .select("id, role_name")
          .in("id", roleIds);
        if (rErr) {
          console.error("Error fetching roles:", rErr);
          setUserRoles([]);
          return;
        }
        setUserRoles((rolesRows || []).map((r: any) => r.role_name));
      } catch (e) {
        console.error(e);
        setUserRoles([]);
      }
    };
    fetchViewerRoles();
  }, [session]);

  // Fetch all role options for the dropdowns
  useEffect(() => {
    const loadRoleOptions = async () => {
      try {
        const { data, error } = await supabase
          .from("roles")
          .select("id, role_name")
          .order("role_name", { ascending: true });
        if (error) throw error;
        setRoles(data as RoleOption[]);
      } catch (e) {
        const err = e as Error;
        console.error("Error loading role options", err);
        toast.error("Failed to load role options");
      }
    };
    loadRoleOptions();
  }, []);

  // Fetch users + their roles + emails via an admin RPC
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        // This RPC must be created in your DB (see summary after code changes)
        const { data, error } = await supabase.rpc("admin_list_users_with_roles");
        if (error) throw error;
        const mapped = (data as any[]).map((row) => ({
          user_id: row.user_id as string,
          email: row.email as string,
          roles: (row.roles as string[]) || [],
        }));
        setUsers(mapped);
      } catch (e) {
        const err = e as Error;
        console.error("Error loading users list", err);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const currentRoleOf = (row: AdminUserRow) => {
    // precedence: admin > volunteer > visitor
    if (row.roles.includes("admin")) return "admin";
    if (row.roles.includes("volunteer")) return "volunteer";
    if (row.roles.includes("visitor")) return "visitor";
    return "";
  };

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.role_name, label: r.role_name })),
    [roles]
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesEmail = !q || u.email.toLowerCase().includes(q);
      const current = currentRoleOf(u);
      const matchesRole =
        roleFilter === "all"
          ? true
          : roleFilter === "uncategorized"
          ? current === ""
          : current === roleFilter;
      return matchesEmail && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleSelectRole = (userId: string, roleName: string) => {
    setPendingRole((prev) => ({ ...prev, [userId]: roleName }));
  };

  const handleSaveRole = async (userId: string) => {
    const roleName = pendingRole[userId];
    if (!roleName) {
      toast.error("Please select a role first");
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [userId]: true }));
      // RPC that atomically sets a single role (removing others)
      const { error } = await supabase.rpc("admin_set_single_role", {
        target_user_id: userId,
        target_role_name: roleName,
      });
      if (error) throw error;

      toast.success("Role updated");
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, roles: [roleName] }
            : u
        )
      );
    } catch (e) {
      const err = e as Error;
      console.error("Error updating role", err);
      toast.error("Failed to update role");
    } finally {
      setSaving((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">No Access</h1>
          <p className="text-gray-600 mb-6">You need admin privileges to view this page.</p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Admin — Users</h1>
              <p className="text-sm text-gray-600">Manage user roles and access</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link to="/dashboard">Inventory</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Controls */}
        <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:max-w-md">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9"
                aria-label="Search users by email"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.243 12h.007l4.75 4.75a.75.75 0 1 0 1.06-1.06l-4.75-4.75v-.007A6.75 6.75 0  0 0 10.5 3.75ZM5.25 10.5a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={roleFilter}
              onValueChange={(v) =>
                setRoleFilter(v as "all" | "admin" | "volunteer" | "visitor" | "uncategorized")
              }
            >
              <SelectTrigger className="w-56" aria-label="Filter by role">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const current = currentRoleOf(u);
                    const next = pendingRole[u.user_id] ?? current;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {current ? (
                            current === "admin" ? (
                              <Badge className="capitalize bg-blue-700 text-white hover:bg-blue-700">
                                {current}
                              </Badge>
                            ) : current === "volunteer" ? (
                              <Badge className="capitalize bg-green-600 text-white hover:bg-green-600">
                                {current}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="capitalize">
                                {current}
                              </Badge>
                            )
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={next || ""}
                            onValueChange={(value) => handleSelectRole(u.user_id, value)}
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleSaveRole(u.user_id)}
                            disabled={saving[u.user_id] || !next || next === current}
                          >
                            {saving[u.user_id] ? "Saving..." : "Save"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}



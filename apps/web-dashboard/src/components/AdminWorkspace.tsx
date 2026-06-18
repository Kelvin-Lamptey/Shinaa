import { useState, useEffect, FormEvent } from "react";
import { API_URL } from "../config";

interface AdminWorkspaceProps {
  token: string;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: "official" | "caretaker" | "super_admin";
}

export default function AdminWorkspace({ token }: AdminWorkspaceProps) {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"official" | "caretaker">("official");
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load staff list");
      }

      const data = await response.json();
      setStaffList(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormSuccess(null);
    setFormError(null);

    if (!name || !email || !password || !role) {
      setFormError("All fields are required");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create staff user");
      }

      setFormSuccess(`Successfully created staff user: ${name} (${role})`);
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("official");
      // Refresh list
      fetchStaff();
    } catch (err: any) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Staff List Table (Left Side, 2 columns wide on large screens) */}
      <div className="lg:col-span-2 bg-white border border-[#D0D7DE] rounded-md shadow-sm">
        <div className="p-4 border-b border-[#D0D7DE] flex justify-between items-center bg-[#F6F8FA] rounded-t-md">
          <div>
            <h2 className="font-semibold text-lg text-[#1F2328]">System Access & Staff Directory</h2>
            <p className="text-xs text-[#656D76] mt-0.5">
              Review and manage system administrators, officials, and key caretakers.
            </p>
          </div>
          <button
            onClick={fetchStaff}
            className="bg-white border border-[#D0D7DE] text-[#24292F] px-2.5 py-1.5 rounded-md text-xs font-semibold hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#F6F8FA] border-b border-[#D0D7DE] text-[#656D76] font-semibold text-xs">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">System Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0D7DE] text-[#1F2328]">
              {staffList.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-sm text-[#656D76]">
                    No staff users found.
                  </td>
                </tr>
              )}

              {staffList.map((staff) => (
                <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#1F2328]">{staff.name}</td>
                  <td className="px-4 py-3 text-[#1F2328]">{staff.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        staff.role === "super_admin"
                          ? "bg-purple-100 text-purple-800 border-purple-200"
                          : staff.role === "official"
                          ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }`}
                    >
                      {staff.role === "super_admin"
                        ? "Super Admin"
                        : staff.role === "official"
                        ? "Official"
                        : "Caretaker"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Form (Right Side, 1 column wide on large screens) */}
      <div className="bg-white border border-[#D0D7DE] rounded-md p-6 shadow-sm h-fit">
        <h2 className="font-semibold text-lg text-[#1F2328] mb-1">Create Staff Account</h2>
        <p className="text-xs text-[#656D76] mb-4">
          Register a new system user. Note: Super Admin accounts cannot be created via the web interface.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
              {formSuccess}
            </div>
          )}

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm font-medium">
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staff-name" className="text-xs font-semibold text-[#1F2328]">
              Full Name
            </label>
            <input
              id="staff-name"
              type="text"
              required
              placeholder="e.g. Sarah Connor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              disabled={formLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staff-email" className="text-xs font-semibold text-[#1F2328]">
              Email Address
            </label>
            <input
              id="staff-email"
              type="email"
              required
              placeholder="e.g. sarah.c@shinaa.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              disabled={formLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staff-password" className="text-xs font-semibold text-[#1F2328]">
              Password
            </label>
            <input
              id="staff-password"
              type="password"
              required
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-[#D0D7DE] rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              disabled={formLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staff-role" className="text-xs font-semibold text-[#1F2328]">
              Workspace Role
            </label>
            <select
              id="staff-role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value as "official" | "caretaker")}
              className="border border-[#D0D7DE] bg-white rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#0969DA] focus:border-transparent shadow-sm"
              disabled={formLoading}
            >
              <option value="official">Official (Manage Schedules & Lecture Halls)</option>
              <option value="caretaker">Caretaker (Locker & Key Operations)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={formLoading}
            className="bg-[#0969DA] text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-[#0353A4] transition-colors w-full cursor-pointer disabled:opacity-50 mt-2"
          >
            {formLoading ? "Creating account..." : "Register Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

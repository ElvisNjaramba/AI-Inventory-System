import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";

// ─── API helpers ─────────────────────────────────────────────────────────────
const shopAPI = {
  list:           ()                       => api.get("shops/"),
  create:         (data)                   => api.post("shops/", data),
  update:         (id, data)               => api.patch(`shops/${id}/`, data),
  delete:         (id)                     => api.delete(`shops/${id}/`),
  getMembers:     (id)                     => api.get(`shops/${id}/members/`),
  addMember:      (id, data)               => api.post(`shops/${id}/members/add/`, data),
  removeMember:   (shopId, userId)         => api.delete(`shops/${shopId}/members/remove/${userId}/`),
  updateRole:     (shopId, userId, role)   => api.patch(`shops/${shopId}/members/role/${userId}/`, { role }),
};

// ─── Tiny UI primitives ───────────────────────────────────────────────────────
const Badge = ({ role }) => {
  const map = {
    owner:   "bg-indigo-100 text-indigo-700",
    manager: "bg-amber-100  text-amber-700",
    staff:   "bg-gray-100   text-gray-600",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${map[role] ?? map.staff}`}>
      {role}
    </span>
  );
};

const Spinner = ({ sm }) => (
  <svg className={`animate-spin ${sm ? "h-4 w-4" : "h-5 w-5"} text-indigo-600`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
  </svg>
);

const Err = ({ msg }) => msg ? (
  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{msg}</p>
) : null;

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">&times;</button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

// ─── Create / Edit Shop Modal ─────────────────────────────────────────────────
const ShopFormModal = ({ shop, onClose, onSaved }) => {
  const editing = !!shop;
  const [form, setForm]     = useState({
    name:    shop?.name    ?? "",
    address: shop?.address ?? "",
    phone:   shop?.phone   ?? "",
    email:   shop?.email   ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      if (editing) {
        await shopAPI.update(shop.id, form);
      } else {
        await shopAPI.create(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "name",    label: "Shop Name",    placeholder: "e.g. Downtown Branch",    required: true },
    { key: "address", label: "Address",      placeholder: "123 Main St"                             },
    { key: "phone",   label: "Phone",        placeholder: "+254 700 000 000"                        },
    { key: "email",   label: "Contact Email",placeholder: "shop@example.com"                        },
  ];

  return (
    <Modal title={editing ? "Edit Shop" : "Create New Shop"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map(({ key, label, placeholder, required }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
            <input
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              required={required}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        ))}
        <Err msg={error} />
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading && <Spinner sm />}
            {editing ? "Save Changes" : "Create Shop"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Add Member Modal ─────────────────────────────────────────────────────────
const EMPTY_FORM = { first_name: "", last_name: "", username: "", email: "", password: "", role: "staff" };

const AddMemberModal = ({ shopId, callerRole, onClose, onAdded }) => {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [showPw,  setShowPw]  = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await shopAPI.addMember(shopId, form);
      onAdded();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object" && !data.detail) {
        const msgs = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("  •  ");
        setError(msgs);
      } else {
        setError(data?.detail ?? "Failed to add member.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = callerRole === "owner"
    ? [{ value: "manager", label: "Manager" }, { value: "staff", label: "Staff" }]
    : [{ value: "staff", label: "Staff" }];

  return (
    <Modal title="Add New Member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Name row */}
        <div className="flex gap-3">
          {[
            { key: "first_name", label: "First Name", placeholder: "John" },
            { key: "last_name",  label: "Last Name",  placeholder: "Doe"  },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">{label} <span className="text-red-400">*</span></label>
              <input value={form[key]} onChange={set(key)} placeholder={placeholder} required
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          ))}
        </div>

        {/* Username */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Username <span className="text-red-400">*</span></label>
          <input value={form.username} onChange={set("username")} placeholder="johndoe123" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Email <span className="text-red-400">*</span></label>
          <input value={form.email} onChange={set("email")} placeholder="john@example.com" type="email" required
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Temporary Password <span className="text-red-400">*</span></label>
          <div className="relative">
            <input value={form.password} onChange={set("password")} type={showPw ? "text" : "password"}
              placeholder="Set a temporary password" required minLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <button type="button" onClick={() => setShowPw(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-500 font-semibold hover:text-indigo-700">
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <p className="text-xs text-gray-400">They can change this after logging in.</p>
        </div>

        {/* Role */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Role <span className="text-red-400">*</span></label>
          <div className="flex gap-3">
            {roleOptions.map(({ value, label }) => (
              <label key={value}
                className={`flex-1 border-2 rounded-lg py-2 text-sm font-semibold text-center cursor-pointer transition-all
                  ${form.role === value ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                <input type="radio" className="sr-only" value={value} checked={form.role === value}
                  onChange={() => setForm(f => ({ ...f, role: value }))} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Err msg={error} />

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {loading && <Spinner sm />}
            Create & Add
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Members Tab ──────────────────────────────────────────────────────────────
const MembersTab = ({ shop, callerRole, onRefresh }) => {
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [removing, setRemoving] = useState(null);
  const [error,    setError]    = useState("");

  const loadMembers = useCallback(() => {
    setLoading(true);
    shopAPI.getMembers(shop.id)
      .then(r => setMembers(r.data))
      .catch(() => setError("Failed to load members."))
      .finally(() => setLoading(false));
  }, [shop.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await shopAPI.removeMember(shop.id, userId);
      setMembers(m => m.filter(x => x.user.id !== userId));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to remove member.");
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await shopAPI.updateRole(shop.id, userId, newRole);
      setMembers(m => m.map(x => x.user.id === userId ? { ...x, role: newRole } : x));
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to update role.");
    }
  };

  const canRemove = (member) => {
    if (callerRole === "owner") return true;
    if (callerRole === "manager" && member.role === "staff") return true;
    return false;
  };

  const canChangeRole = callerRole === "owner";

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Member
        </button>
      </div>

      <Err msg={error} />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-sm">No members yet. Add a manager or staff member.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map(member => (
            <div key={member.id}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center uppercase">
                  {(member.user.first_name?.[0] ?? member.user.username?.[0] ?? "?")}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {member.user.first_name || member.user.last_name
                      ? `${member.user.first_name} ${member.user.last_name}`.trim()
                      : member.user.username}
                  </p>
                  <p className="text-xs text-gray-400">@{member.user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Role badge / dropdown */}
                {canChangeRole ? (
                  <select
                    value={member.role}
                    onChange={e => handleRoleChange(member.user.id, e.target.value)}
                    className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                ) : (
                  <Badge role={member.role} />
                )}

                {/* Remove button */}
                {canRemove(member) && (
                  <button
                    onClick={() => handleRemove(member.user.id)}
                    disabled={removing === member.user.id}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold disabled:opacity-50 transition-colors"
                  >
                    {removing === member.user.id ? <Spinner sm /> : "Remove"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddMemberModal
          shopId={shop.id}
          callerRole={callerRole}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadMembers(); onRefresh(); }}
        />
      )}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab = ({ shop, onUpdated, onDeleted }) => {
  const [form,    setForm]    = useState({
    name:      shop.name      ?? "",
    address:   shop.address   ?? "",
    phone:     shop.phone     ?? "",
    email:     shop.email     ?? "",
    is_active: shop.is_active ?? true,
  });
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(false);
    try {
      setLoading(true);
      await shopAPI.update(shop.id, form);
      setSuccess(true);
      onUpdated();
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await shopAPI.delete(shop.id);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.detail ?? "Failed to delete shop.");
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-lg">
      {[
        { key: "name",    label: "Shop Name",     placeholder: "Branch name",        required: true  },
        { key: "address", label: "Address",        placeholder: "Street address"                      },
        { key: "phone",   label: "Phone",          placeholder: "+254 700 000 000"                    },
        { key: "email",   label: "Contact Email",  placeholder: "shop@example.com"                    },
      ].map(({ key, label, placeholder, required }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
          <input
            value={form[key]}
            onChange={set(key)}
            placeholder={placeholder}
            required={required}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      ))}

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" className="sr-only" checked={form.is_active} onChange={set("is_active")} />
          <div className={`w-10 h-5 rounded-full transition-colors ${form.is_active ? "bg-indigo-600" : "bg-gray-300"}`} />
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? "translate-x-5" : ""}`} />
        </div>
        <span className="text-sm font-semibold text-gray-700">Shop is active</span>
      </label>

      <Err msg={error} />
      {success && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Changes saved successfully.</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg px-6 py-2 text-sm font-semibold transition-colors flex items-center gap-2">
          {loading && <Spinner sm />} Save Changes
        </button>
      </div>

      {/* Danger zone */}
      <div className="mt-6 border border-red-200 rounded-xl p-4 bg-red-50">
        <p className="text-sm font-bold text-red-700 mb-1">Danger Zone</p>
        <p className="text-xs text-red-500 mb-3">Deleting this shop is permanent and cannot be undone.</p>
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)}
            className="text-sm font-semibold text-red-600 border border-red-300 rounded-lg px-4 py-1.5 hover:bg-red-100 transition-colors">
            Delete Shop
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold text-red-700">Are you sure?</p>
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-1.5 transition-colors flex items-center gap-1.5">
              {deleting && <Spinner sm />} Yes, Delete
            </button>
            <button type="button" onClick={() => setConfirm(false)}
              className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}
      </div>
    </form>
  );
};

// ─── Shop Detail Panel ────────────────────────────────────────────────────────
const ShopDetail = ({ shop, onRefresh, onDeleted }) => {
  const [tab, setTab] = useState("members");
  const tabs = [
    { key: "members",  label: "Members"  },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Shop header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-lg uppercase">
            {shop.name[0]}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">{shop.name}</h2>
            <p className="text-xs text-gray-400">{shop.address || "No address set"}</p>
          </div>
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${shop.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {shop.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
                ${tab === t.key ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "members" && (
          <MembersTab shop={shop} callerRole="owner" onRefresh={onRefresh} />
        )}
        {tab === "settings" && (
          <SettingsTab shop={shop} onUpdated={onRefresh} onDeleted={onDeleted} />
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManageStaff() {
  const [shops,      setShops]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error,      setError]      = useState("");

  const loadShops = useCallback(() => {
    return shopAPI.list()
      .then(r => {
        setShops(r.data);
        // Keep selected in sync after refresh
        if (selected) {
          const refreshed = r.data.find(s => s.id === selected.id);
          setSelected(refreshed ?? r.data[0] ?? null);
        } else if (r.data.length > 0) {
          setSelected(r.data[0]);
        }
      })
      .catch(() => setError("Failed to load shops."))
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => { loadShops(); }, []); // eslint-disable-line

  const handleDeleted = () => {
    loadShops().then(() => {
      setShops(prev => {
        const remaining = prev.filter(s => s.id !== selected?.id);
        setSelected(remaining[0] ?? null);
        return remaining;
      });
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <h1 className="font-bold text-gray-900 text-lg">Shop Manager</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{shops.length} shop{shops.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span className="text-base leading-none">+</span> New Shop
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 65px)" }}>
        {/* ── Sidebar: shop list ── */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-y-auto shrink-0">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Shops</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : shops.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No shops yet.<br />Create your first one!
            </div>
          ) : (
            <nav className="flex flex-col gap-1 px-2 pb-4">
              {shops.map(shop => (
                <button
                  key={shop.id}
                  onClick={() => setSelected(shop)}
                  className={`w-full text-left rounded-xl px-3 py-3 transition-all
                    ${selected?.id === shop.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center uppercase
                      ${selected?.id === shop.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                      {shop.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${selected?.id === shop.id ? "text-white" : "text-gray-800"}`}>
                        {shop.name}
                      </p>
                      <p className={`text-xs truncate ${selected?.id === shop.id ? "text-indigo-200" : "text-gray-400"}`}>
                        {shop.member_count ?? 0} member{(shop.member_count ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {!shop.is_active && (
                      <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold
                        ${selected?.id === shop.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"}`}>
                        Off
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* ── Main panel ── */}
        <main className="flex-1 overflow-hidden bg-white">
          {error && (
            <div className="p-6"><Err msg={error} /></div>
          )}
          {!loading && !selected && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-lg font-semibold text-gray-500">No shop selected</p>
              <p className="text-sm mt-1">Create a shop or select one from the sidebar.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Create Your First Shop
              </button>
            </div>
          )}
          {selected && (
            <ShopDetail
              key={selected.id}
              shop={selected}
              onRefresh={loadShops}
              onDeleted={handleDeleted}
            />
          )}
        </main>
      </div>

      {/* Create shop modal */}
      {showCreate && (
        <ShopFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadShops(); }}
        />
      )}
    </div>
  );
}
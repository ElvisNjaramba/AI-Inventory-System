import api from "./axios";

// ─── Shops ───────────────────────────────────────────────────────────────────

export const getShops       = ()           => api.get("shops/");
export const getShop        = (id)         => api.get(`shops/${id}/`);
export const createShop     = (data)       => api.post("shops/", data, { headers: { "Content-Type": "multipart/form-data" } });
export const updateShop     = (id, data)   => api.patch(`shops/${id}/`, data, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteShop     = (id)         => api.delete(`shops/${id}/`);

// ─── Members ─────────────────────────────────────────────────────────────────

export const getMembers     = (shopId)            => api.get(`shops/${shopId}/members/`);
export const addMember      = (shopId, data)      => api.post(`shops/${shopId}/members/add/`, data);
//   data = { user_id: <id>, role: 'manager' | 'staff' }

export const removeMember   = (shopId, userId)    => api.delete(`shops/${shopId}/members/remove/${userId}/`);
export const updateMemberRole = (shopId, userId, role) =>
  api.patch(`shops/${shopId}/members/role/${userId}/`, { role });
const API_BASE = "";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "เกิดข้อผิดพลาด");
    return data.data;
}

// ---- อะไหล่ ----
export const getParts = (params?: Record<string, string>) =>
    apiFetch<any[]>(`/api/parts?${new URLSearchParams(params)}`);
export const getPartByBarcode = (code: string) =>
    apiFetch<any>(`/api/parts/barcode/${code}`);
export const createPart = (data: any) =>
    apiFetch<any>("/api/parts", { method: "POST", body: JSON.stringify(data) });
export const updatePart = (id: string, data: any) =>
    apiFetch<any>(`/api/parts/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deletePart = (id: string) =>
    apiFetch<any>(`/api/parts/${id}`, { method: "DELETE" });

// ---- ประเภท ----
export const getCategories = () => apiFetch<any[]>("/api/categories");
export const createCategory = (data: any) =>
    apiFetch<any>("/api/categories", { method: "POST", body: JSON.stringify(data) });
export const deleteCategory = (id: string) =>
    apiFetch<any>(`/api/categories/${id}`, { method: "DELETE" });

// ---- การเบิก ----
export const getWithdrawals = (params?: Record<string, string>) =>
    apiFetch<any[]>(`/api/withdrawals?${new URLSearchParams(params)}`);
export const createWithdrawal = (data: any) =>
    apiFetch<any>("/api/withdrawals", { method: "POST", body: JSON.stringify(data) });

// ---- เคลื่อนไหวสต็อก ----
export const getMovements = (params?: Record<string, string>) =>
    apiFetch<any[]>(`/api/movements?${new URLSearchParams(params)}`);
export const createMovement = (data: any) =>
    apiFetch<any>("/api/movements", { method: "POST", body: JSON.stringify(data) });

// ---- เคลมประกัน ----
export const getClaims = (params?: Record<string, string>) =>
    apiFetch<any[]>(`/api/claims?${new URLSearchParams(params)}`);
export const getClaim = (id: string) => apiFetch<any>(`/api/claims/${id}`);
export const createClaim = (data: any) =>
    apiFetch<any>("/api/claims", { method: "POST", body: JSON.stringify(data) });
export const updateClaimStatus = (id: string, status: string) =>
    apiFetch<any>(`/api/claims/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
export const notifyClaimCustomer = (id: string) =>
    apiFetch<any>(`/api/claims/${id}/notify`, { method: "POST" });
export const deleteClaim = (id: string) =>
    apiFetch<any>(`/api/claims/${id}`, { method: "DELETE" });

// ---- สต็อก Dashboard ----
export const getStockSummary = () => apiFetch<any>("/api/stock/summary");

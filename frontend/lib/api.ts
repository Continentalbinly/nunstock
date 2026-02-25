const API_BASE = "";

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    parentId?: string | null;
    parent?: { id: string, name: string } | null;
    _count?: { parts: number };
}
interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

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

async function apiFetchPaginated<T>(path: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "เกิดข้อผิดพลาด");
    return { data: data.data, pagination: data.pagination };
}

// ---- อะไหล่ (paginated) ----
export const getParts = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/parts?${new URLSearchParams(params)}`);
export const getPartsAll = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/parts?pageSize=999&${new URLSearchParams(params)}`).then((r) => r.data);
export const createPart = (data: any) =>
    apiFetch<any>("/api/parts", { method: "POST", body: JSON.stringify(data) });
export const updatePart = (id: string, data: any) =>
    apiFetch<any>(`/api/parts/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const deletePart = (id: string) =>
    fetch(`${API_BASE}/api/parts/${id}`, { method: "DELETE", credentials: "include" }).then((r) => r.json());
export const deletePartForce = (id: string) =>
    apiFetch<any>(`/api/parts/${id}/force`, { method: "DELETE" });

// ---- ประเภท ----
export const getCategories = () => apiFetch<any[]>("/api/categories");
export const createCategory = (data: any) =>
    apiFetch<any>("/api/categories", { method: "POST", body: JSON.stringify(data) });
export const updateCategory = (id: string, data: { name: string }) =>
    apiFetch<any>(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCategory = (id: string) =>
    apiFetch<any>(`/api/categories/${id}`, { method: "DELETE" });

// ---- เคลื่อนไหวสต็อก (paginated) ----
export const getMovements = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/movements?${new URLSearchParams(params)}`);
export const createMovement = (data: any) =>
    apiFetch<any>("/api/movements", { method: "POST", body: JSON.stringify(data) });

// ---- เคลมประกัน (paginated) ----
export const getClaims = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/claims?${new URLSearchParams(params)}`);
export const getClaimsAll = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/claims?pageSize=999&${new URLSearchParams(params)}`).then((r) => r.data);
export const getClaim = (id: string) => apiFetch<any>(`/api/claims/${id}`);
export const createClaim = (data: any) =>
    apiFetch<any>("/api/claims", { method: "POST", body: JSON.stringify(data) });
export const updateClaimStatus = (id: string, status: string) =>
    apiFetch<any>(`/api/claims/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
export const notifyClaimCustomer = (id: string, lineUserId?: string) =>
    fetch(`${API_BASE}/api/claims/${id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lineUserId }),
    }).then((r) => r.json());
export const deleteClaim = (id: string) =>
    apiFetch<any>(`/api/claims/${id}`, { method: "DELETE" });

// ---- สต็อก Dashboard ----
export const getStockSummary = () => apiFetch<any>("/api/stock/summary");

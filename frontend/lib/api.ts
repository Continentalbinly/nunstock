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
    if (!data.success) {
        const err = data.error;
        let msg = "เกิดข้อผิดพลาด";
        if (typeof err === "string") {
            msg = err;
        } else if (err?.issues) {
            msg = err.issues.map((i: any) => i.message).join(", ");
        } else if (err?.message) {
            msg = err.message;
        }
        throw new Error(msg);
    }
    return data.data;
}

async function apiFetchPaginated<T>(path: string, options?: RequestInit): Promise<PaginatedResponse<T>> {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options,
    });
    const data = await res.json();
    if (!data.success) {
        const err = data.error;
        let msg = "เกิดข้อผิดพลาด";
        if (typeof err === "string") {
            msg = err;
        } else if (err?.issues) {
            msg = err.issues.map((i: any) => i.message).join(", ");
        } else if (err?.message) {
            msg = err.message;
        }
        throw new Error(msg);
    }
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

// ---- Lookup Options (UNIT / SPEC) ----
export const getLookupOptions = (group: string) =>
    apiFetch<any[]>(`/api/lookup-options?group=${group}`);
export const createLookupOption = (data: { group: string; value: string }) =>
    apiFetch<any>("/api/lookup-options", { method: "POST", body: JSON.stringify(data) });

// ---- เคลื่อนไหวสต็อก (paginated) ----
export const getMovements = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/movements?${new URLSearchParams(params)}`);
export const createMovement = (data: any) =>
    apiFetch<any>("/api/movements", { method: "POST", body: JSON.stringify(data) });


export const createBatchMovements = (data: { items: { partId: string; quantity: number; reason?: string }[]; reason?: string }) =>
    apiFetch<any>("/api/movements/batch", { method: "POST", body: JSON.stringify(data) });

// ---- สต็อก Dashboard ----
export const getStockSummary = () => apiFetch<any>("/api/stock/summary");

// ---- สต็อกหน้าร้าน (Shop Stock) ----
export const getShopStock = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/shop-stock?${new URLSearchParams(params)}`);
export const getShopStockSummary = () => apiFetch<any>("/api/shop-stock/summary");
export const createShopStock = (data: any) =>
    apiFetch<any>("/api/shop-stock", { method: "POST", body: JSON.stringify(data) });
export const updateShopStock = (id: string, data: any) =>
    apiFetch<any>(`/api/shop-stock/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const updateShopStockCondition = (id: string, condition: string) =>
    apiFetch<any>(`/api/shop-stock/${id}/condition`, { method: "PATCH", body: JSON.stringify({ condition }) });

export const deleteShopStock = (id: string) =>
    apiFetch<any>(`/api/shop-stock/${id}`, { method: "DELETE" });

// ---- งานซ่อม (Jobs) ----
export const getJobs = (params?: Record<string, string>) =>
    apiFetchPaginated<any>(`/api/jobs?${new URLSearchParams(params)}`);
export const getJobSuggestions = (field: string, q: string) =>
    apiFetch<{ suggestions: string[] }>(`/api/jobs/suggestions?field=${field}&q=${encodeURIComponent(q)}`);
export const getJobsSummary = () => apiFetch<any>("/api/jobs/summary");
export const getJob = (id: string) => apiFetch<any>(`/api/jobs/${id}`);
export const createJob = (data: any) =>
    apiFetch<any>("/api/jobs", { method: "POST", body: JSON.stringify(data) });
export const updateJob = (id: string, data: any) =>
    apiFetch<any>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const updateJobStatus = (id: string, status: string) =>
    apiFetch<any>(`/api/jobs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const addJobPart = (jobId: string, data: any) =>
    apiFetch<any>(`/api/jobs/${jobId}/parts`, { method: "POST", body: JSON.stringify(data) });
export const removeJobPart = (jobId: string, partId: string) =>
    apiFetch<any>(`/api/jobs/${jobId}/parts/${partId}`, { method: "DELETE" });
export const updateJobPartStatus = (jobId: string, partId: string, status: string) =>
    apiFetch<any>(`/api/jobs/${jobId}/parts/${partId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
export const addRepairStep = (jobId: string, step: string, label: string) =>
    apiFetch<any>(`/api/jobs/${jobId}/repair-steps`, { method: "POST", body: JSON.stringify({ step, label }) });
export const removeRepairStep = (jobId: string, stepId: string) =>
    apiFetch<any>(`/api/jobs/${jobId}/repair-steps/${stepId}`, { method: "DELETE" });
export const advanceRepairStep = (jobId: string, stepId: string) =>
    apiFetch<any>(`/api/jobs/${jobId}/repair-steps/${stepId}/advance`, { method: "PATCH" });
export const reorderRepairSteps = (jobId: string, order: string[]) =>
    apiFetch<any>(`/api/jobs/${jobId}/repair-steps/reorder`, { method: "PATCH", body: JSON.stringify({ order }) });
export const getRepairStepTemplates = () =>
    apiFetch<any>(`/api/jobs/repair-step-templates`);
export const cancelJob = (id: string, reason: string) =>
    apiFetch<any>(`/api/jobs/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) });
export const lookupJobPartBarcode = (barcode: string) =>
    apiFetch<any>(`/api/jobs/parts/lookup/${encodeURIComponent(barcode)}`);
export const getActiveJobs = () =>
    apiFetch<any>(`/api/jobs/active-jobs`);

// ─── Notifications ─────────
export const getNotifications = (page = 1, pageSize = 20, status?: string) =>
    apiFetch<any>(`/api/notifications?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ""}`);
export const retryNotification = (id: string) =>
    apiFetch<any>(`/api/notifications/${id}/retry`, { method: "POST" });
export const sendNotification = (jobId: string, message: string) =>
    apiFetch<any>(`/api/notifications/send`, { method: "POST", body: JSON.stringify({ jobId, message }) });

// ─── Car Types ─────────
export const getCarTypes = () => apiFetch<any[]>("/api/car-types");
export const createCarType = (data: { key: string; label: string; brands: string[]; order?: number }) =>
    apiFetch<any>("/api/car-types", { method: "POST", body: JSON.stringify(data) });
export const updateCarType = (id: string, data: { label?: string; brands?: string[]; order?: number }) =>
    apiFetch<any>(`/api/car-types/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCarType = (id: string) =>
    apiFetch<any>(`/api/car-types/${id}`, { method: "DELETE" });




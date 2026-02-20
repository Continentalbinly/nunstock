import { Context } from "hono";

export interface PaginationParams {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export function parsePagination(c: Context): PaginationParams {
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query("pageSize") || "20")));
    return {
        page,
        pageSize,
        skip: (page - 1) * pageSize,
        take: pageSize,
    };
}

export function paginatedJson<T>(data: T[], total: number, params: PaginationParams) {
    return {
        success: true,
        data,
        pagination: {
            page: params.page,
            pageSize: params.pageSize,
            total,
            totalPages: Math.ceil(total / params.pageSize),
        },
    };
}

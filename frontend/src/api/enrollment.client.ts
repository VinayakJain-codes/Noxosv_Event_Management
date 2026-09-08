import {api} from "./client";
import {publicApi} from "./public-client";
import {GenericDataResponse, GenericPaginatedResponse, IdParam, QueryFilters} from "../types";
import {queryParamsHelper} from "../utilites/queryParamsHelper";

export interface EventEnrollment {
    id: number;
    event_id: number;
    enrollment_no: string;
    first_name: string;
    last_name: string;
    email: string | null;
    class: string | null;
    department: string | null;
    extra_data: any | null;
    is_used: boolean;
    used_by_order_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface ImportEnrollmentsResponse {
    total_rows: number;
    imported: number;
    skipped: number;
    errors: string[];
}

export interface LookupEnrollmentResponse {
    enrollment_no: string;
    first_name: string;
    last_name: string;
    email: string | null;
    class: string | null;
    department: string | null;
    is_used: boolean;
}

export const enrollmentClient = {
    import: async (eventId: IdParam, file: File, mapping?: Record<string, string>) => {
        const formData = new FormData();
        formData.append('file', file);
        if (mapping) {
            formData.append('mapping', JSON.stringify(mapping));
        }
        
        const response = await api.post<ImportEnrollmentsResponse>(
            `events/${eventId}/enrollments/import`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            }
        );
        return response.data;
    },

    getPaginated: async (eventId: IdParam, filters?: QueryFilters) => {
        const response = await api.get<GenericPaginatedResponse<EventEnrollment>>(
            `events/${eventId}/enrollments` + (filters ? queryParamsHelper.buildQueryString(filters) : '')
        );
        return response.data;
    },

    delete: async (eventId: IdParam, enrollmentId: IdParam) => {
        const response = await api.delete(`events/${eventId}/enrollments/${enrollmentId}`);
        return response.data;
    },

    deleteAll: async (eventId: IdParam) => {
        const response = await api.delete(`events/${eventId}/enrollments`);
        return response.data;
    },

    export: async (eventId: IdParam) => {
        const response = await api.get(`events/${eventId}/enrollments/export`, {
            responseType: 'blob',
        });
        return response.data;
    },

    lookup: async (eventId: IdParam, enrollmentNo: string) => {
        const response = await publicApi.get<GenericDataResponse<LookupEnrollmentResponse>>(
            `events/${eventId}/enrollments/lookup?enrollment_no=${encodeURIComponent(enrollmentNo)}`
        );
        return response.data;
    }
};

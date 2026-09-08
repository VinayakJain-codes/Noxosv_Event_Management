import {useQuery} from "@tanstack/react-query";
import {IdParam} from "../types";
import {enrollmentClient} from "../api/enrollment.client";

export const useLookupEnrollment = (eventId: IdParam, enrollmentNo: string, isEnabled: boolean = true) => {
    return useQuery({
        queryKey: ['enrollment-lookup', eventId, enrollmentNo],
        queryFn: () => enrollmentClient.lookup(eventId, enrollmentNo),
        enabled: !!eventId && !!enrollmentNo && isEnabled,
        retry: false, // Do not retry on 404 (not found)
    });
};

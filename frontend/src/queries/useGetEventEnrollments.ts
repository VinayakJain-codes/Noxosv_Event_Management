import {useQuery} from "@tanstack/react-query";
import {IdParam, QueryFilters} from "../types";
import {enrollmentClient} from "../api/enrollment.client";

export const useGetEventEnrollments = (eventId: IdParam, filters?: QueryFilters) => {
    return useQuery({
        queryKey: ['event-enrollments', eventId, filters],
        queryFn: () => enrollmentClient.getPaginated(eventId, filters),
        enabled: !!eventId,
    });
};

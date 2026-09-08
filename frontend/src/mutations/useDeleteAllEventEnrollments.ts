import {useMutation, useQueryClient} from "@tanstack/react-query";
import {IdParam} from "../types";
import {enrollmentClient} from "../api/enrollment.client";

export const useDeleteAllEventEnrollments = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (eventId: IdParam) => enrollmentClient.deleteAll(eventId),
        onSuccess: (_data, eventId) => {
            queryClient.invalidateQueries({queryKey: ['event-enrollments', eventId]});
        },
    });
};

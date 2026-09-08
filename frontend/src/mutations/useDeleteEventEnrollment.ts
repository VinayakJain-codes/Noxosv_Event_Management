import {useMutation, useQueryClient} from "@tanstack/react-query";
import {IdParam} from "../types";
import {enrollmentClient} from "../api/enrollment.client";

export const useDeleteEventEnrollment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({eventId, enrollmentId}: {eventId: IdParam, enrollmentId: IdParam}) => enrollmentClient.delete(eventId, enrollmentId),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({queryKey: ['event-enrollments', variables.eventId]});
        },
    });
};

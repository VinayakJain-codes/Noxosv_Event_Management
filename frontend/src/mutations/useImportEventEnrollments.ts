import {useMutation, useQueryClient} from "@tanstack/react-query";
import {IdParam} from "../types";
import {enrollmentClient} from "../api/enrollment.client";

export const useImportEventEnrollments = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({eventId, file, mapping}: {eventId: IdParam, file: File, mapping?: Record<string, string>}) =>
            enrollmentClient.import(eventId, file, mapping),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({queryKey: ['event-enrollments', variables.eventId]});
        },
    });
};

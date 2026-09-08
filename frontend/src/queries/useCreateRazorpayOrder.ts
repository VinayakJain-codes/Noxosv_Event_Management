import {useQuery} from "@tanstack/react-query";
import {orderClientPublic} from "../api/order.client.ts";
import {IdParam} from "../types.ts";

export const GET_CREATE_RAZORPAY_ORDER_PUBLIC_QUERY_KEY = 'getRazorpayOrderPublic';

export const useCreateRazorpayOrder = (eventId?: IdParam, orderShortId?: IdParam, enabled: boolean = true) => {
    return useQuery({
        queryKey: [GET_CREATE_RAZORPAY_ORDER_PUBLIC_QUERY_KEY, eventId, orderShortId],

        queryFn: async () => {
            if (!eventId || !orderShortId) {
                return null;
            }
            return await orderClientPublic.createRazorpayOrder(
                eventId,
                String(orderShortId),
            );
        },

        enabled: enabled && !!eventId && !!orderShortId,
        retry: false,
        staleTime: 0,
        gcTime: 0
    });
};

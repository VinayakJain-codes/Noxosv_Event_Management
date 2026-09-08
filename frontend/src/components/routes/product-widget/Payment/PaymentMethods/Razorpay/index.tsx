import {useParams, useNavigate} from "react-router";
import {useEffect} from "react";
import {useCreateRazorpayOrder} from "../../../../../../queries/useCreateRazorpayOrder.ts";
import {useGetEventPublic} from "../../../../../../queries/useGetEventPublic.ts";
import {CheckoutContent} from "../../../../../layouts/Checkout/CheckoutContent";
import {HomepageInfoMessage} from "../../../../../common/HomepageInfoMessage";
import {LoadingMask} from "../../../../../common/LoadingMask";
import {eventCheckoutPath, eventHomepagePath} from "../../../../../../utilites/urlHelper.ts";
import {loadRazorpay, RazorpayPaymentResponse} from "../../../../../../utilites/razorpay.ts";
import {showError} from "../../../../../../utilites/notifications.tsx";
import {orderClientPublic} from "../../../../../../api/order.client.ts";
import {Event} from "../../../../../../types.ts";
import {Group, Paper, Stack, Text, ThemeIcon} from "@mantine/core";
import {IconCreditCard, IconDeviceMobile, IconLock, IconShieldCheck} from "@tabler/icons-react";
import {t} from "@lingui/macro";
import {trackEvent, AnalyticsEvents} from "../../../../../../utilites/analytics.ts";

interface RazorpayPaymentMethodProps {
    enabled: boolean;
    setSubmitHandler: (submitHandler: () => () => Promise<void>) => void;
}

export const RazorpayPaymentMethod = ({enabled, setSubmitHandler}: RazorpayPaymentMethodProps) => {
    const {eventId, orderShortId} = useParams();
    const navigate = useNavigate();
    const {
        data: razorpayData,
        isFetched: isRazorpayFetched,
        error: razorpayError,
    } = useCreateRazorpayOrder(eventId, orderShortId, enabled);

    const {data: event} = useGetEventPublic(eventId);

    useEffect(() => {
        if (!enabled) return;

        loadRazorpay()
            .catch(() => {
                showError(t`Unable to load Razorpay payment SDK.`);
            });
    }, [enabled]);

    useEffect(() => {
        if (!razorpayData?.razorpay_order_id) {
            return;
        }

        const handleSubmit = async () => {
            try {
                const RazorpayConstructor = await loadRazorpay();
                if (!RazorpayConstructor) {
                    showError(t`Failed to load Razorpay SDK.`);
                    return;
                }

                const razorpay = new RazorpayConstructor({
                    key: razorpayData.key_id,
                    amount: razorpayData.amount,
                    currency: razorpayData.currency,
                    order_id: razorpayData.razorpay_order_id,
                    handler: async (response: RazorpayPaymentResponse) => {
                        try {
                            const result = await orderClientPublic.verifyRazorpayPayment(
                                eventId!,
                                String(orderShortId),
                                {
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                }
                            );

                            if (result.status === 'paid') {
                                const totalCents = Math.round((razorpayData.amount || 0));
                                trackEvent(AnalyticsEvents.PURCHASE_COMPLETED_PAID, { value: totalCents });
                                navigate(eventCheckoutPath(eventId, orderShortId, 'summary'));
                            } else {
                                showError(t`Payment verification failed. Please contact support.`);
                            }
                        } catch {
                            showError(t`Payment verification failed. Please try again.`);
                        }
                    },
                    theme: {
                        color: '#228be6',
                    },
                    modal: {
                        ondismiss: () => {
                            // User closed the modal without completing payment
                        },
                    },
                });

                razorpay.open();
            } catch (err: any) {
                showError(err?.message || t`Payment failed to start. Please try again.`);
            }
        };

        setSubmitHandler(() => handleSubmit);
    }, [razorpayData?.razorpay_order_id, setSubmitHandler, eventId, orderShortId, navigate]);

    if (!enabled) {
        return (
            <CheckoutContent>
                <HomepageInfoMessage
                    status="warning"
                    message={t`Payments not available`}
                    subtitle={t`Online payments are not enabled for this event.`}
                    link={eventHomepagePath(event as Event)}
                    linkText={t`Return to Event`}
                />
            </CheckoutContent>
        );
    }

    if (razorpayError && event) {
        return (
            <CheckoutContent>
                <HomepageInfoMessage
                    status="error"
                    /* @ts-ignore */
                    message={razorpayError?.response?.data?.message || t`Something went wrong`}
                    subtitle={t`Please restart the checkout process.`}
                    link={eventHomepagePath(event)}
                    linkText={t`Return to Event`}
                />
            </CheckoutContent>
        );
    }

    if (!isRazorpayFetched) {
        return <LoadingMask />;
    }

    return (
        <Stack gap="md">
            <Paper withBorder p="lg" radius="md">
                <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                        <ThemeIcon color="teal" size="md" radius="xl">
                            <IconShieldCheck size={18} />
                        </ThemeIcon>
                        <Text fw={600} size="md">
                            {t`Razorpay Secure Payments`}
                        </Text>
                    </Group>
                </Group>

                <Text size="sm" c="dimmed" mb="md">
                    {t`A secure payment window will open for you to complete your payment.`}
                </Text>

                <Group gap="lg">
                    <Group gap="xs">
                        <IconDeviceMobile size={18} />
                        <Text size="xs" fw={500}>{t`UPI (GPay, PhonePe, Paytm)`}</Text>
                    </Group>
                    <Group gap="xs">
                        <IconCreditCard size={18} />
                        <Text size="xs" fw={500}>{t`Cards & Net Banking`}</Text>
                    </Group>
                    <Group gap="xs">
                        <IconLock size={18} />
                        <Text size="xs" c="dimmed">{t`256-bit Encryption`}</Text>
                    </Group>
                </Group>
            </Paper>
        </Stack>
    );
};

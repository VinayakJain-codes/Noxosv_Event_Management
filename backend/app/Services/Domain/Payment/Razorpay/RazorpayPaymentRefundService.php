<?php

namespace HiEvents\Services\Domain\Payment\Razorpay;

use Exception;
use HiEvents\DomainObjects\RazorpayPaymentDomainObject;
use HiEvents\Services\Infrastructure\Razorpay\RazorpayClient;
use HiEvents\Values\MoneyValue;

class RazorpayPaymentRefundService
{
    public function __construct(
        private readonly RazorpayClient $razorpayClient,
    ) {}

    /**
     * @throws Exception
     */
    public function refundPayment(
        MoneyValue $amount,
        RazorpayPaymentDomainObject $payment,
        ?string $reason = null,
    ): array {
        $amountInPaise = (int) round($amount->getAmount() * 100);

        return $this->razorpayClient->createRefund(
            paymentId: $payment->getRazorpayPaymentId(),
            refundData: [
                'amount' => $amountInPaise,
                'notes' => [
                    'reason' => $reason ?: __('Order refund'),
                ],
            ]
        );
    }
}

<?php

namespace HiEvents\Services\Domain\Payment\Razorpay\DTOs;

use HiEvents\DataTransferObjects\BaseDataObject;

class CreateRazorpayPaymentSessionResponseDTO extends BaseDataObject
{
    public function __construct(
        public string $razorpayOrderId,
        public string $orderId,
        public string $keyId,
        public int $amount,
        public string $currency,
        public string $orderShortId,
    ) {}
}

<?php

namespace HiEvents\Http\Actions\Orders\Payment\Razorpay;

use Exception;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Services\Application\Handlers\Order\Payment\Razorpay\CreateRazorpayPaymentSessionHandler;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class CreateRazorpayPaymentSessionActionPublic extends BaseAction
{
    public function __construct(
        private readonly CreateRazorpayPaymentSessionHandler $createRazorpayPaymentSessionHandler,
    ) {}

    public function __invoke(int $eventId, string $orderShortId): JsonResponse
    {
        try {
            $sessionDTO = $this->createRazorpayPaymentSessionHandler->handle($orderShortId);
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->jsonResponse([
            'razorpay_order_id' => $sessionDTO->razorpayOrderId,
            'order_id' => $sessionDTO->orderId,
            'key_id' => $sessionDTO->keyId,
            'amount' => $sessionDTO->amount,
            'currency' => $sessionDTO->currency,
            'order_short_id' => $sessionDTO->orderShortId,
        ]);
    }
}

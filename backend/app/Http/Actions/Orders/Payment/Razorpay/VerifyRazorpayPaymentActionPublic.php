<?php

namespace HiEvents\Http\Actions\Orders\Payment\Razorpay;

use Exception;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Services\Application\Handlers\Order\Payment\Razorpay\VerifyRazorpayPaymentHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyRazorpayPaymentActionPublic extends BaseAction
{
    public function __construct(
        private readonly VerifyRazorpayPaymentHandler $verifyRazorpayPaymentHandler,
    ) {}

    public function __invoke(Request $request, int $eventId, string $orderShortId): JsonResponse
    {
        try {
            $result = $this->verifyRazorpayPaymentHandler->handle(
                orderShortId: $orderShortId,
                razorpayOrderId: (string) $request->input('razorpay_order_id', ''),
                razorpayPaymentId: (string) $request->input('razorpay_payment_id', ''),
                razorpaySignature: (string) $request->input('razorpay_signature', ''),
            );
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->jsonResponse($result);
    }
}

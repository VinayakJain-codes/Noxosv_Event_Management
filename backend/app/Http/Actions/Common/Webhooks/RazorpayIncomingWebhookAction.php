<?php

namespace HiEvents\Http\Actions\Common\Webhooks;

use HiEvents\Http\Actions\BaseAction;
use HiEvents\Http\ResponseCodes;
use HiEvents\Services\Domain\Payment\Razorpay\EventHandlers\RazorpayPaymentSuccessHandler;
use HiEvents\Services\Infrastructure\Razorpay\RazorpayClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Psr\Log\LoggerInterface;
use Throwable;

class RazorpayIncomingWebhookAction extends BaseAction
{
    public function __construct(
        private readonly RazorpayClient $razorpayClient,
        private readonly RazorpayPaymentSuccessHandler $paymentSuccessHandler,
        private readonly LoggerInterface $logger,
    ) {}

    public function __invoke(Request $request): Response
    {
        try {
            $rawPayload = $request->getContent();
            $signature = (string) $request->header('X-Razorpay-Signature', '');

            if (! empty($signature)) {
                $isValid = $this->razorpayClient->verifyWebhookSignature($rawPayload, $signature);
                if (! $isValid) {
                    $this->logger->warning('Razorpay webhook signature mismatch');
                    return $this->noContentResponse(ResponseCodes::HTTP_BAD_REQUEST);
                }
            }

            $payload = json_decode($rawPayload, true) ?: [];
            $eventType = $payload['event'] ?? '';
            $paymentEntity = $payload['payload']['payment']['entity'] ?? [];

            $this->logger->info('Razorpay webhook received', [
                'event' => $eventType,
            ]);

            if (in_array($eventType, ['payment.captured', 'payment.authorized'], true)) {
                $razorpayOrderId = (string) ($paymentEntity['order_id'] ?? '');
                $razorpayPaymentId = (string) ($paymentEntity['id'] ?? '');

                if (! empty($razorpayOrderId)) {
                    $this->paymentSuccessHandler->handlePaymentSuccess(
                        razorpayOrderId: $razorpayOrderId,
                        razorpayPaymentId: $razorpayPaymentId,
                        paymentDetails: $paymentEntity,
                    );
                }
            }
        } catch (Throwable $exception) {
            $this->logger->error('Error processing Razorpay webhook: ' . $exception->getMessage(), [
                'exception' => $exception,
            ]);

            return $this->noContentResponse(ResponseCodes::HTTP_BAD_REQUEST);
        }

        return $this->noContentResponse();
    }
}

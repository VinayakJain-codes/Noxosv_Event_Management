<?php

namespace HiEvents\Services\Domain\Payment\Razorpay;

use Exception;
use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\DomainObjects\OrderDomainObject;
use HiEvents\Repository\Interfaces\RazorpayPaymentRepositoryInterface;
use HiEvents\Services\Domain\Payment\Razorpay\DTOs\CreateRazorpayPaymentSessionResponseDTO;
use HiEvents\Services\Infrastructure\Razorpay\RazorpayClient;
use Illuminate\Database\DatabaseManager;
use Psr\Log\LoggerInterface;

class RazorpayPaymentSessionCreationService
{
    public function __construct(
        private readonly RazorpayClient $razorpayClient,
        private readonly RazorpayPaymentRepositoryInterface $razorpayPaymentRepository,
        private readonly DatabaseManager $databaseManager,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * @throws Exception
     */
    public function createPaymentSession(
        OrderDomainObject $order,
        EventDomainObject $event,
    ): CreateRazorpayPaymentSessionResponseDTO {
        $existingPayment = $this->razorpayPaymentRepository->findFirstWhere([
            'order_id' => $order->getId(),
            'order_status' => 'created',
        ]);

        if ($existingPayment && $existingPayment->getRazorpayOrderId()) {
            return new CreateRazorpayPaymentSessionResponseDTO(
                razorpayOrderId: $existingPayment->getRazorpayOrderId(),
                orderId: (string) $order->getId(),
                keyId: $this->razorpayClient->getKeyId() ?? '',
                amount: (int) round($order->getTotalGross() * 100),
                currency: $order->getCurrency() ?: 'INR',
                orderShortId: $order->getShortId(),
            );
        }

        $amountInPaise = (int) round($order->getTotalGross() * 100);
        $currency = $order->getCurrency() ?: 'INR';

        $payload = [
            'amount' => $amountInPaise,
            'currency' => $currency,
            'receipt' => 'order_' . $order->getShortId(),
            'notes' => [
                'hi_events_order_id' => (string) $order->getId(),
                'event_title' => $event->getTitle(),
            ],
        ];

        $this->databaseManager->beginTransaction();

        try {
            $response = $this->razorpayClient->createOrder($payload);

            $razorpayOrderId = $response['id'] ?? null;

            if (! $razorpayOrderId) {
                throw new Exception(__('Razorpay did not return an order ID.'));
            }

            $this->razorpayPaymentRepository->create([
                'order_id' => $order->getId(),
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => null,
                'order_status' => $response['status'] ?? 'created',
                'amount' => $order->getTotalGross(),
                'currency' => $currency,
                'payment_details' => $response,
            ]);

            $this->databaseManager->commit();

            return new CreateRazorpayPaymentSessionResponseDTO(
                razorpayOrderId: $razorpayOrderId,
                orderId: (string) $order->getId(),
                keyId: $this->razorpayClient->getKeyId() ?? '',
                amount: $amountInPaise,
                currency: $currency,
                orderShortId: $order->getShortId(),
            );
        } catch (Exception $e) {
            $this->databaseManager->rollBack();
            $this->logger->error("Failed to create Razorpay order: {$e->getMessage()}", [
                'order_id' => $order->getId(),
                'exception' => $e,
            ]);

            throw $e;
        }
    }
}

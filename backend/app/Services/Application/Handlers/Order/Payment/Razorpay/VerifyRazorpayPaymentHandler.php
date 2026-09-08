<?php

namespace HiEvents\Services\Application\Handlers\Order\Payment\Razorpay;

use Exception;
use HiEvents\DomainObjects\OrderDomainObject;
use HiEvents\DomainObjects\RazorpayPaymentDomainObject;
use HiEvents\DomainObjects\Status\OrderStatus;
use HiEvents\Repository\Eloquent\Value\Relationship;
use HiEvents\Repository\Interfaces\OrderRepositoryInterface;
use HiEvents\Repository\Interfaces\RazorpayPaymentRepositoryInterface;
use HiEvents\Services\Domain\Payment\Razorpay\EventHandlers\RazorpayPaymentSuccessHandler;
use HiEvents\Services\Infrastructure\Razorpay\RazorpayClient;
use Throwable;

readonly class VerifyRazorpayPaymentHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private RazorpayPaymentRepositoryInterface $razorpayPaymentRepository,
        private RazorpayClient $razorpayClient,
        private RazorpayPaymentSuccessHandler $paymentSuccessHandler,
    ) {}

    /**
     * @throws Throwable
     */
    public function handle(
        string $orderShortId,
        string $razorpayOrderId,
        string $razorpayPaymentId,
        string $razorpaySignature,
    ): array {
        $order = $this->orderRepository
            ->loadRelation(new Relationship(RazorpayPaymentDomainObject::class, name: 'razorpay_payment'))
            ->findByShortId($orderShortId);

        if (! $order) {
            throw new Exception(__('Order not found.'));
        }

        if ($order->getStatus() === OrderStatus::COMPLETED->name) {
            return [
                'status' => 'paid',
                'order_status' => $order->getStatus(),
            ];
        }

        $isValid = $this->razorpayClient->verifyPaymentSignature(
            $razorpayOrderId,
            $razorpayPaymentId,
            $razorpaySignature,
        );

        if (! $isValid) {
            return [
                'status' => 'signature_mismatch',
                'order_status' => $order->getStatus(),
            ];
        }

        $this->paymentSuccessHandler->handlePaymentSuccess(
            razorpayOrderId: $razorpayOrderId,
            razorpayPaymentId: $razorpayPaymentId,
            paymentDetails: [
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => $razorpayPaymentId,
                'razorpay_signature' => $razorpaySignature,
            ],
        );

        return [
            'status' => 'paid',
            'order_status' => OrderStatus::COMPLETED->name,
        ];
    }
}

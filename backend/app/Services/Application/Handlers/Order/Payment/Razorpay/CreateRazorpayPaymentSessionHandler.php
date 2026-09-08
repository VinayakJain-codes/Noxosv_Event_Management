<?php

namespace HiEvents\Services\Application\Handlers\Order\Payment\Razorpay;

use Exception;
use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\DomainObjects\OrderItemDomainObject;
use HiEvents\DomainObjects\RazorpayPaymentDomainObject;
use HiEvents\DomainObjects\Status\OrderStatus;
use HiEvents\Exceptions\ResourceConflictException;
use HiEvents\Exceptions\UnauthorizedException;
use HiEvents\Repository\Eloquent\Value\Relationship;
use HiEvents\Repository\Interfaces\OrderRepositoryInterface;
use HiEvents\Services\Domain\Payment\Razorpay\DTOs\CreateRazorpayPaymentSessionResponseDTO;
use HiEvents\Services\Domain\Payment\Razorpay\RazorpayPaymentSessionCreationService;
use HiEvents\Services\Infrastructure\Session\CheckoutSessionManagementService;

readonly class CreateRazorpayPaymentSessionHandler
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private RazorpayPaymentSessionCreationService $paymentSessionCreationService,
        private CheckoutSessionManagementService $sessionIdentifierService,
    ) {}

    /**
     * @throws Exception
     */
    public function handle(string $orderShortId): CreateRazorpayPaymentSessionResponseDTO
    {
        $order = $this->orderRepository
            ->loadRelation(new Relationship(OrderItemDomainObject::class))
            ->loadRelation(new Relationship(RazorpayPaymentDomainObject::class, name: 'razorpay_payment'))
            ->loadRelation(new Relationship(EventDomainObject::class, name: 'event'))
            ->findByShortId($orderShortId);

        if (! $order || ! $this->sessionIdentifierService->verifySession($order->getSessionId())) {
            throw new UnauthorizedException(__('Sorry, we could not verify your session. Please create a new order.'));
        }

        if ($order->getStatus() !== OrderStatus::RESERVED->name || $order->isReservedOrderExpired()) {
            throw new ResourceConflictException(__('Sorry, your order is expired or not in a valid state.'));
        }

        $event = $order->getEvent();

        return $this->paymentSessionCreationService->createPaymentSession($order, $event);
    }
}

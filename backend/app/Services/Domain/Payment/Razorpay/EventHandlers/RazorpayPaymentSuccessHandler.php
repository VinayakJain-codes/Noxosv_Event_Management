<?php

namespace HiEvents\Services\Domain\Payment\Razorpay\EventHandlers;

use HiEvents\DomainObjects\Enums\PaymentProviders;
use HiEvents\DomainObjects\EventSettingDomainObject;
use HiEvents\DomainObjects\Generated\EventSettingDomainObjectAbstract;
use HiEvents\DomainObjects\Generated\OrderDomainObjectAbstract;
use HiEvents\DomainObjects\OrderDomainObject;
use HiEvents\DomainObjects\OrderItemDomainObject;
use HiEvents\DomainObjects\RazorpayPaymentDomainObject;
use HiEvents\DomainObjects\Status\AttendeeStatus;
use HiEvents\DomainObjects\Status\OrderPaymentStatus;
use HiEvents\DomainObjects\Status\OrderStatus;
use HiEvents\Events\OrderStatusChangedEvent;
use HiEvents\Repository\Eloquent\Value\Relationship;
use HiEvents\Repository\Interfaces\AffiliateRepositoryInterface;
use HiEvents\Repository\Interfaces\AttendeeRepositoryInterface;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use HiEvents\Repository\Interfaces\EventSettingsRepositoryInterface;
use HiEvents\Repository\Interfaces\OrderRepositoryInterface;
use HiEvents\Repository\Interfaces\RazorpayPaymentRepositoryInterface;
use HiEvents\Services\Domain\Product\ProductQuantityUpdateService;
use HiEvents\Services\Infrastructure\DomainEvents\DomainEventDispatcherService;
use HiEvents\Services\Infrastructure\DomainEvents\Enums\DomainEventType;
use HiEvents\Services\Infrastructure\DomainEvents\Events\OrderEvent;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Database\DatabaseManager;
use Psr\Log\LoggerInterface;
use Throwable;

class RazorpayPaymentSuccessHandler
{
    public function __construct(
        private readonly OrderRepositoryInterface $orderRepository,
        private readonly RazorpayPaymentRepositoryInterface $razorpayPaymentRepository,
        private readonly AffiliateRepositoryInterface $affiliateRepository,
        private readonly ProductQuantityUpdateService $quantityUpdateService,
        private readonly AttendeeRepositoryInterface $attendeeRepository,
        private readonly DatabaseManager $databaseManager,
        private readonly LoggerInterface $logger,
        private readonly CacheRepository $cache,
        private readonly DomainEventDispatcherService $domainEventDispatcherService,
        private readonly EventSettingsRepositoryInterface $eventSettingsRepository,
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    /**
     * @throws Throwable
     */
    public function handlePaymentSuccess(
        string $razorpayOrderId,
        ?string $razorpayPaymentId = null,
        array $paymentDetails = [],
    ): ?OrderDomainObject {
        $cacheKey = 'razorpay_order_handled_' . $razorpayOrderId;
        if ($this->cache->get($cacheKey)) {
            $this->logger->info('Razorpay order already handled', ['razorpay_order_id' => $razorpayOrderId]);
            return null;
        }

        $result = $this->databaseManager->transaction(function () use ($razorpayOrderId, $razorpayPaymentId, $paymentDetails) {
            /** @var RazorpayPaymentDomainObject|null $razorpayPayment */
            $razorpayPayment = $this->razorpayPaymentRepository
                ->loadRelation(new Relationship(OrderDomainObject::class, name: 'order', nested: [
                    new Relationship(OrderItemDomainObject::class),
                ]))
                ->findFirstWhere([
                    'razorpay_order_id' => $razorpayOrderId,
                ]);

            if (! $razorpayPayment) {
                $this->logger->error('Razorpay payment record not found for razorpay_order_id', [
                    'razorpay_order_id' => $razorpayOrderId,
                ]);

                return null;
            }

            $order = $razorpayPayment->getOrder();
            if (! $order) {
                $order = $this->orderRepository
                    ->loadRelation(OrderItemDomainObject::class)
                    ->findById($razorpayPayment->getOrderId());
            }

            if ($order && $order->getStatus() === OrderStatus::COMPLETED->name) {
                return ['order' => $order, 'eventSettings' => null];
            }

            $updateAttributes = [
                'order_status' => 'paid',
                'payment_details' => $paymentDetails,
            ];

            if ($razorpayPaymentId) {
                $updateAttributes['razorpay_payment_id'] = $razorpayPaymentId;
            }

            $this->razorpayPaymentRepository->updateWhere(
                attributes: $updateAttributes,
                where: [
                    'id' => $razorpayPayment->getId(),
                ]
            );

            $updatedOrder = $this->orderRepository
                ->loadRelation(OrderItemDomainObject::class)
                ->updateFromArray($razorpayPayment->getOrderId(), [
                    OrderDomainObjectAbstract::PAYMENT_STATUS => OrderPaymentStatus::PAYMENT_RECEIVED->name,
                    OrderDomainObjectAbstract::STATUS => OrderStatus::COMPLETED->name,
                    OrderDomainObjectAbstract::PAYMENT_PROVIDER => PaymentProviders::RAZORPAY->value,
                ]);

            if ($updatedOrder->getAffiliateId()) {
                $this->affiliateRepository->incrementSales(
                    affiliateId: $updatedOrder->getAffiliateId(),
                    amount: $updatedOrder->getTotalGross()
                );
            }

            $this->attendeeRepository->updateWhere(
                attributes: [
                    'status' => AttendeeStatus::ACTIVE->name,
                ],
                where: [
                    'order_id' => $updatedOrder->getId(),
                    'status' => AttendeeStatus::AWAITING_PAYMENT->name,
                ]
            );

            $this->enrollmentRepository->updateWhere(
                attributes: [
                    'is_used' => true,
                ],
                where: [
                    'used_by_order_id' => $updatedOrder->getId(),
                ]
            );

            $this->quantityUpdateService->updateQuantitiesFromOrder($updatedOrder);

            /** @var EventSettingDomainObject|null $eventSettings */
            $eventSettings = $this->eventSettingsRepository->findFirstWhere([
                EventSettingDomainObjectAbstract::EVENT_ID => $updatedOrder->getEventId(),
            ]);

            return ['order' => $updatedOrder, 'eventSettings' => $eventSettings];
        });

        if ($result === null || ! isset($result['order'])) {
            return null;
        }

        $this->cache->put($cacheKey, true, 3600);

        $order = $result['order'];
        $eventSettings = $result['eventSettings'];

        if ($eventSettings) {
            event(new OrderStatusChangedEvent($order, createInvoice: $eventSettings->getEnableInvoicing()));
        }

        $this->domainEventDispatcherService->dispatch(
            new OrderEvent(
                type: DomainEventType::ORDER_CREATED,
                orderId: $order->getId()
            ),
        );

        return $order;
    }
}

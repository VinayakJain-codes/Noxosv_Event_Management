<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\Status\OrderStatus;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use HiEvents\Repository\Interfaces\EventSettingsRepositoryInterface;
use HiEvents\Repository\Interfaces\OrderRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LookupEnrollmentActionPublic extends BaseAction
{
    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
        private readonly EventSettingsRepositoryInterface $eventSettingsRepository,
        private readonly OrderRepositoryInterface $orderRepository,
    ) {}

    public function __invoke(Request $request, int $eventId): JsonResponse
    {
        $enrollmentNo = $request->input('enrollment_no');

        if (empty($enrollmentNo)) {
            return $this->errorResponse(__('Enrollment number is required.'), 422);
        }

        $settings = $this->eventSettingsRepository->findFirstWhere([
            'event_id' => $eventId,
        ]);

        if (!$settings || !$settings->getEnrollmentEnabled()) {
            return $this->errorResponse(__('Enrollment verification is not enabled for this event.'), 404);
        }

        $enrollment = $this->enrollmentRepository->findFirstWhere([
            'event_id' => $eventId,
            'enrollment_no' => $enrollmentNo,
        ]);

        if (!$enrollment) {
            return $this->errorResponse(__('Enrollment number not found.'), 404);
        }

        if ($settings->getEnrollmentRestrictToOneTicket()) {
            $isUsed = $enrollment->getIsUsed();
            $usedByOrderId = $enrollment->getUsedByOrderId();

            if ($usedByOrderId) {
                $order = $this->orderRepository->findById($usedByOrderId);
                if (! $order
                    || in_array($order->getStatus(), [OrderStatus::CANCELLED->name, OrderStatus::ABANDONED->name], true)
                    || ($order->getStatus() === OrderStatus::RESERVED->name && $order->isReservedOrderExpired())
                ) {
                    $isUsed = false;
                    $this->enrollmentRepository->updateWhere(
                        attributes: [
                            'is_used' => false,
                            'used_by_order_id' => null,
                        ],
                        where: [
                            'id' => $enrollment->getId(),
                        ],
                    );
                } elseif ($order->getStatus() === OrderStatus::COMPLETED->name) {
                    $isUsed = true;
                }
            }

            if ($isUsed) {
                return $this->errorResponse(__('This enrollment number has already been used to purchase a ticket.'), 422);
            }
        }

        return $this->jsonResponse([
            'enrollment_no' => $enrollment->getEnrollmentNo(),
            'first_name' => $enrollment->getFirstName(),
            'last_name' => $enrollment->getLastName(),
            'email' => $enrollment->getEmail(),
            'class' => $enrollment->getClass(),
            'department' => $enrollment->getDepartment(),
            'is_used' => $enrollment->getIsUsed(),
        ], wrapInData: true);
    }
}

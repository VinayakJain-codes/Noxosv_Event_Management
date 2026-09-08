<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use HiEvents\Resources\Enrollment\EventEnrollmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GetEventEnrollmentsAction extends BaseAction
{
    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    public function __invoke(Request $request, int $eventId): JsonResponse
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class);

        $enrollments = $this->enrollmentRepository->findByEventId(
            eventId: $eventId,
            params: $this->getPaginationQueryParams($request),
        );

        return $this->resourceResponse(
            resource: EventEnrollmentResource::class,
            data: $enrollments,
        );
    }
}

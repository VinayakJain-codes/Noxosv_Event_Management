<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DeleteEventEnrollmentAction extends BaseAction
{
    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    public function __invoke(Request $request, int $eventId, int $enrollmentId): Response
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class);

        $this->enrollmentRepository->deleteWhere([
            'id' => $enrollmentId,
            'event_id' => $eventId,
        ]);

        return $this->deletedResponse();
    }
}

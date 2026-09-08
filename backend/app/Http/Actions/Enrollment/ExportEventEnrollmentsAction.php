<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportEventEnrollmentsAction extends BaseAction
{
    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    public function __invoke(Request $request, int $eventId): StreamedResponse
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class);

        $enrollments = $this->enrollmentRepository->findWhere([
            'event_id' => $eventId,
        ]);

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="enrollments.csv"',
        ];

        return response()->stream(function () use ($enrollments) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'enrollment_no',
                'first_name',
                'last_name',
                'email',
                'class',
                'department',
                'is_used',
                'used_by_order_id',
            ]);

            foreach ($enrollments as $enrollment) {
                fputcsv($handle, [
                    $enrollment->getEnrollmentNo(),
                    $enrollment->getFirstName(),
                    $enrollment->getLastName(),
                    $enrollment->getEmail(),
                    $enrollment->getClass(),
                    $enrollment->getDepartment(),
                    $enrollment->getIsUsed() ? 'Yes' : 'No',
                    $enrollment->getUsedByOrderId(),
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }
}

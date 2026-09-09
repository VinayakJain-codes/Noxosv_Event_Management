<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use HiEvents\Resources\Enrollment\EventEnrollmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class CreateEventEnrollmentAction extends BaseAction
{
    public function __construct(
        private readonly EventEnrollmentRepositoryInterface $enrollmentRepository,
    ) {}

    /**
     * @throws ValidationException
     */
    public function __invoke(Request $request, int $eventId): JsonResponse
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class);

        $validated = $this->validate($request, [
            'enrollment_no' => [
                'required',
                'string',
                'max:100',
                Rule::unique('event_enrollments', 'enrollment_no')->where('event_id', $eventId),
            ],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'class' => ['nullable', 'string', 'max:100'],
            'department' => ['nullable', 'string', 'max:100'],
        ]);

        $enrollment = $this->enrollmentRepository->create([
            'event_id' => $eventId,
            'enrollment_no' => trim($validated['enrollment_no']),
            'first_name' => trim($validated['first_name']),
            'last_name' => isset($validated['last_name']) && trim($validated['last_name']) !== '' ? trim($validated['last_name']) : '',
            'email' => !empty($validated['email']) ? trim($validated['email']) : null,
            'class' => !empty($validated['class']) ? trim($validated['class']) : null,
            'department' => !empty($validated['department']) ? trim($validated['department']) : null,
            'is_used' => false,
        ]);

        return $this->resourceResponse(
            resource: EventEnrollmentResource::class,
            data: $enrollment,
            status: Response::HTTP_CREATED,
        );
    }
}

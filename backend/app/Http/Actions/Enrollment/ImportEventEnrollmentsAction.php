<?php

namespace HiEvents\Http\Actions\Enrollment;

use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Services\Domain\Enrollment\ImportEventEnrollmentsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ImportEventEnrollmentsAction extends BaseAction
{
    public function __construct(
        private readonly ImportEventEnrollmentsService $importService,
    ) {}

    /**
     * @throws ValidationException
     */
    public function __invoke(Request $request, int $eventId): JsonResponse
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class);

        $this->validate($request, [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'mapping' => ['nullable'],
        ]);

        $mapping = $request->input('mapping');
        if (is_string($mapping)) {
            $mapping = json_decode($mapping, true) ?? [];
        } elseif (!is_array($mapping)) {
            $mapping = [];
        }

        $result = $this->importService->import($eventId, $request->file('file'), $mapping);

        return $this->jsonResponse($result);
    }
}

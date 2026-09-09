<?php

namespace HiEvents\Http\Actions\Questions;

use HiEvents\DomainObjects\Enums\Role;
use HiEvents\DomainObjects\EventDomainObject;
use HiEvents\Exports\AnswersExport;
use HiEvents\Http\Actions\BaseAction;
use HiEvents\Services\Application\Handlers\Question\ExportAnswersHandler;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportQuestionAnswersAction extends BaseAction
{
    public function __construct(
        private readonly AnswersExport $export,
        private readonly ExportAnswersHandler $exportAnswersHandler,
    ) {}

    public function __invoke(Request $request, int $eventId): BinaryFileResponse
    {
        $this->isActionAuthorized($eventId, EventDomainObject::class, Role::VIEWER);

        $questions = $this->exportAnswersHandler->handle($eventId);

        return Excel::download(
            $this->export->withData($questions),
            "event-{$eventId}-question-answers.xlsx"
        );
    }
}

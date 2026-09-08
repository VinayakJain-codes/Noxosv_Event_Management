<?php

namespace HiEvents\Services\Application\Handlers\Event\DTO;

use HiEvents\DataTransferObjects\BaseDTO;
use HiEvents\Http\DTO\QueryParamsDTO;

class GetEventsDTO extends BaseDTO
{
    public function __construct(
        public int $accountId,
        public QueryParamsDTO $queryParams,
        public ?int $userId = null,
        public ?string $userRole = null,
    ) {}
}

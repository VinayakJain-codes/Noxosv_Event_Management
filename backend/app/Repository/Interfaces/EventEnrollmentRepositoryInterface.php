<?php

namespace HiEvents\Repository\Interfaces;

use HiEvents\DomainObjects\EventEnrollmentDomainObject;
use HiEvents\Http\DTO\QueryParamsDTO;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * @extends RepositoryInterface<EventEnrollmentDomainObject>
 */
interface EventEnrollmentRepositoryInterface extends RepositoryInterface
{
    public function findByEventId(int $eventId, QueryParamsDTO $params): LengthAwarePaginator;
}

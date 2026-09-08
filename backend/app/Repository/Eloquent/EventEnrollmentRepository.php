<?php

namespace HiEvents\Repository\Eloquent;

use HiEvents\DomainObjects\EventEnrollmentDomainObject;
use HiEvents\DomainObjects\Generated\EventEnrollmentDomainObjectAbstract;
use HiEvents\Http\DTO\QueryParamsDTO;
use HiEvents\Models\EventEnrollment;
use HiEvents\Repository\Interfaces\EventEnrollmentRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * @extends BaseRepository<EventEnrollmentDomainObject>
 */
class EventEnrollmentRepository extends BaseRepository implements EventEnrollmentRepositoryInterface
{
    protected function getModel(): string
    {
        return EventEnrollment::class;
    }

    public function getDomainObject(): string
    {
        return EventEnrollmentDomainObject::class;
    }

    public function findByEventId(int $eventId, QueryParamsDTO $params): LengthAwarePaginator
    {
        $where = [
            [EventEnrollmentDomainObjectAbstract::EVENT_ID, '=', $eventId],
        ];

        if ($params->query) {
            $where[] = static function (Builder $builder) use ($params) {
                $builder
                    ->orWhere(EventEnrollmentDomainObjectAbstract::ENROLLMENT_NO, 'ilike', '%' . $params->query . '%')
                    ->orWhere(EventEnrollmentDomainObjectAbstract::FIRST_NAME, 'ilike', '%' . $params->query . '%')
                    ->orWhere(EventEnrollmentDomainObjectAbstract::LAST_NAME, 'ilike', '%' . $params->query . '%')
                    ->orWhere(EventEnrollmentDomainObjectAbstract::EMAIL, 'ilike', '%' . $params->query . '%');
            };
        }

        $this->model = $this->model->orderBy(
            $params->sort_by ?: 'id',
            $params->sort_direction ?: 'desc',
        );

        return $this->paginateWhere(
            where: $where,
            limit: $params->per_page,
            page: $params->page,
        );
    }
}

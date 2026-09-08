<?php

namespace HiEvents\Services\Application\Handlers\Event;

use HiEvents\DomainObjects\Enums\Role;
use HiEvents\DomainObjects\EventLocationDomainObject;
use HiEvents\DomainObjects\EventOccurrenceDomainObject;
use HiEvents\DomainObjects\EventSettingDomainObject;
use HiEvents\DomainObjects\EventStatisticDomainObject;
use HiEvents\DomainObjects\ImageDomainObject;
use HiEvents\DomainObjects\LocationDomainObject;
use HiEvents\DomainObjects\OrganizerDomainObject;
use HiEvents\DomainObjects\ProductDomainObject;
use HiEvents\DomainObjects\ProductPriceDomainObject;
use HiEvents\Repository\Eloquent\Value\Relationship;
use HiEvents\Repository\Interfaces\EventRepositoryInterface;
use HiEvents\Services\Application\Handlers\Event\DTO\GetEventsDTO;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class GetEventsHandler
{
    public function __construct(
        private readonly EventRepositoryInterface $eventRepository,
    ) {}

    public function handle(GetEventsDTO $dto): LengthAwarePaginator
    {
        $where = [
            'account_id' => $dto->accountId,
        ];

        if ($dto->userRole === Role::VIEWER->value && $dto->userId !== null) {
            $where[] = static function (Builder $builder) use ($dto) {
                $builder->whereHas('assignedUsers', function (Builder $query) use ($dto) {
                    $query->where('users.id', $dto->userId);
                });
            };
        }

        return $this->eventRepository
            ->loadRelation(new Relationship(domainObject: EventLocationDomainObject::class, name: 'event_location', nested: [
                new Relationship(domainObject: LocationDomainObject::class, name: 'location'),
            ]))
            ->loadRelation(new Relationship(domainObject: EventOccurrenceDomainObject::class, nested: [
                new Relationship(domainObject: EventLocationDomainObject::class, name: 'event_location', nested: [
                    new Relationship(domainObject: LocationDomainObject::class, name: 'location'),
                ]),
            ]))
            ->loadRelation(new Relationship(ImageDomainObject::class))
            ->loadRelation(new Relationship(EventSettingDomainObject::class))
            ->loadRelation(new Relationship(EventStatisticDomainObject::class))
            ->loadRelation(new Relationship(
                domainObject: ProductDomainObject::class,
                nested: [
                    new Relationship(ProductPriceDomainObject::class),
                ],
            ))
            ->loadRelation(new Relationship(
                domainObject: OrganizerDomainObject::class,
                name: 'organizer',
            ))
            ->findEvents(
                where: $where,
                params: $dto->queryParams
            );
    }
}

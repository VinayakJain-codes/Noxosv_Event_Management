<?php

namespace HiEvents\DomainObjects;

use HiEvents\DomainObjects\Interfaces\IsFilterable;
use HiEvents\DomainObjects\Interfaces\IsSortable;
use HiEvents\DomainObjects\SortingAndFiltering\AllowedSorts;

class EventEnrollmentDomainObject extends Generated\EventEnrollmentDomainObjectAbstract implements IsSortable, IsFilterable
{
    public static function getDefaultSort(): string
    {
        return self::ID;
    }

    public static function getAllowedSorts(): AllowedSorts
    {
        return new AllowedSorts(
            [
                self::ID => [
                    'asc' => __('Older First'),
                    'desc' => __('Newest First'),
                ],
                self::CREATED_AT => [
                    'asc' => __('Added Date (Older First)'),
                    'desc' => __('Added Date (Newest First)'),
                ],
                self::ENROLLMENT_NO => [
                    'asc' => __('Enrollment No (Ascending)'),
                    'desc' => __('Enrollment No (Descending)'),
                ],
                self::FIRST_NAME => [
                    'asc' => __('First Name (A-Z)'),
                    'desc' => __('First Name (Z-A)'),
                ],
            ]
        );
    }

    public static function getDefaultSortDirection(): string
    {
        return 'desc';
    }

    public static function getAllowedFilterFields(): array
    {
        return [
            self::IS_USED,
        ];
    }
}

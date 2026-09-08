<?php

declare(strict_types=1);

namespace HiEvents\Resources\Enrollment;

use HiEvents\DomainObjects\EventEnrollmentDomainObject;
use HiEvents\Resources\BaseResource;
use Illuminate\Http\Request;

/**
 * @mixin EventEnrollmentDomainObject
 */
class EventEnrollmentResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getId(),
            'event_id' => $this->getEventId(),
            'enrollment_no' => $this->getEnrollmentNo(),
            'first_name' => $this->getFirstName(),
            'last_name' => $this->getLastName(),
            'email' => $this->getEmail(),
            'class' => $this->getClass(),
            'department' => $this->getDepartment(),
            'extra_data' => $this->getExtraData(),
            'is_used' => $this->getIsUsed(),
            'used_by_order_id' => $this->getUsedByOrderId(),
            'created_at' => $this->getCreatedAt(),
            'updated_at' => $this->getUpdatedAt(),
        ];
    }
}

<?php

namespace HiEvents\Models;

class EventEnrollment extends BaseModel
{
    protected function getTimestampsEnabled(): bool
    {
        return true;
    }

    protected function getCastMap(): array
    {
        return [
            'extra_data' => 'array',
            'is_used' => 'boolean',
        ];
    }
}

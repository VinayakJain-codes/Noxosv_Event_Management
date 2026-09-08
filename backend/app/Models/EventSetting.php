<?php

namespace HiEvents\Models;

use Illuminate\Database\Eloquent\SoftDeletes;

class EventSetting extends BaseModel
{
    use SoftDeletes;

    protected function getCastMap(): array
    {
        return [
            'payment_providers' => 'array',
            'ticket_design_settings' => 'array',
            'homepage_theme_settings' => 'array',
            'enrollment_enabled' => 'boolean',
            'enrollment_restrict_to_one_ticket' => 'boolean',
        ];
    }
}

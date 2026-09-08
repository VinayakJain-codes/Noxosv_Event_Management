<?php

namespace HiEvents\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class RazorpayPayment extends BaseModel
{
    use SoftDeletes;

    protected function getTimestampsEnabled(): bool
    {
        return true;
    }

    protected function getCastMap(): array
    {
        return [
            'payment_details' => 'array',
            'last_error' => 'array',
            'amount' => 'float',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // For existing question_answers with null attendee_id, link them to the attendee of that order
        DB::statement('
            UPDATE question_answers qa
            SET attendee_id = a.id
            FROM attendees a
            WHERE qa.order_id = a.order_id
              AND qa.attendee_id IS NULL
        ');
    }

    public function down(): void
    {
        // No-op
    }
};

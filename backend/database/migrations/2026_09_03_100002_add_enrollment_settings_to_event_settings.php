<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_settings', function (Blueprint $table) {
            $table->boolean('enrollment_enabled')->default(false);
            $table->boolean('enrollment_restrict_to_one_ticket')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('event_settings', function (Blueprint $table) {
            $table->dropColumn(['enrollment_enabled', 'enrollment_restrict_to_one_ticket']);
        });
    }
};

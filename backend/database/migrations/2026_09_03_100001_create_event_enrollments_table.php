<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->string('enrollment_no');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('class')->nullable();
            $table->string('department')->nullable();
            $table->jsonb('extra_data')->nullable();
            $table->boolean('is_used')->default(false);
            $table->foreignId('used_by_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'enrollment_no']);
            $table->index(['event_id', 'is_used']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_enrollments');
    }
};

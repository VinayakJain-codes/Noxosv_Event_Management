<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cashfree_payments', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('cf_order_id')->nullable()->index();
            $table->string('payment_session_id', 500)->nullable();
            $table->string('order_status', 50)->default('ACTIVE');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('INR');
            $table->jsonb('payment_details')->nullable();
            $table->jsonb('last_error')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashfree_payments');
    }
};

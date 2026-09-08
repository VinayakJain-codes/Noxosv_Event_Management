<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('cashfree_payments') && !Schema::hasTable('razorpay_payments')) {
            Schema::rename('cashfree_payments', 'razorpay_payments');
        }

        if (Schema::hasTable('razorpay_payments')) {
            Schema::table('razorpay_payments', static function (Blueprint $table) {
                if (Schema::hasColumn('razorpay_payments', 'cf_order_id')) {
                    $table->renameColumn('cf_order_id', 'razorpay_order_id');
                }
                if (Schema::hasColumn('razorpay_payments', 'payment_session_id')) {
                    $table->renameColumn('payment_session_id', 'razorpay_payment_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('razorpay_payments')) {
            Schema::table('razorpay_payments', static function (Blueprint $table) {
                if (Schema::hasColumn('razorpay_payments', 'razorpay_order_id')) {
                    $table->renameColumn('razorpay_order_id', 'cf_order_id');
                }
                if (Schema::hasColumn('razorpay_payments', 'razorpay_payment_id')) {
                    $table->renameColumn('razorpay_payment_id', 'payment_session_id');
                }
            });

            if (!Schema::hasTable('cashfree_payments')) {
                Schema::rename('razorpay_payments', 'cashfree_payments');
            }
        }
    }
};

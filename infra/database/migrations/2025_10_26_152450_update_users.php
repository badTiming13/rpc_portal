<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // keep them nullable so existing users don't break
            $table->string('onchain_username', 64)->nullable()->after('wallet');

            // using unsignedBigInteger because these are counters (>=0)
            $table->unsignedBigInteger('onchain_posts_created')->nullable()->after('onchain_username');
            $table->unsignedBigInteger('onchain_likes_received')->nullable()->after('onchain_posts_created');
            $table->unsignedBigInteger('onchain_likes_given')->nullable()->after('onchain_likes_received');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'onchain_username',
                'onchain_posts_created',
                'onchain_likes_received',
                'onchain_likes_given',
            ]);
        });
    }
};

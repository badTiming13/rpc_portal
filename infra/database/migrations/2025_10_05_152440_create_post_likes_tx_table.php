<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('post_likes_tx', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();

            // кто лайкнул
            $table->foreignId('liker_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('liker_wallet', 64)->index();

            // ончейн
            $table->string('tx_signature', 128)->unique();
            $table->unsignedBigInteger('slot')->index();
            $table->timestampTz('block_time')->nullable()->index();

            $table->timestamps();

            // логическая идемпотентность лайка
            $table->unique(['post_id','liker_wallet']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('post_likes_tx');
    }
};

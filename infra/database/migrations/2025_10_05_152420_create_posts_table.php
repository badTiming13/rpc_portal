<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('posts', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('root_signature', 128)->unique(); // подпишем на chain_txs.signature через app-уровень

            $table->unsignedBigInteger('first_slot')->index();
            $table->timestampTz('first_block_time')->nullable()->index();

            $table->text('content_short')->nullable();

            $table->string('reply_to_root_signature', 128)->nullable()->index();

            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('comments_count')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('posts');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('post_chunks', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();

            // порядок кусков (0..N)
            $table->unsignedInteger('chunk_index');

            // ончейн-данные для конкретного куска
            $table->string('tx_signature', 128)->unique();
            $table->unsignedBigInteger('slot')->index();
            $table->timestampTz('block_time')->nullable()->index();

            $table->text('content'); // до ~1000 байт/тx

            $table->timestamps();

            $table->unique(['post_id','chunk_index']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('post_chunks');
    }
};

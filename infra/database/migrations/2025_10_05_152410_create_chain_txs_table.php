<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('chain_txs', function (Blueprint $table) {
            $table->bigIncrements('id');
            // base on-chain
            $table->string('signature', 128)->unique();
            $table->unsignedBigInteger('slot')->index();
            $table->timestampTz('block_time')->nullable()->index();
            $table->string('program_id', 64)->nullable()->index();
            $table->string('kind', 32)->index(); // 'post' | 'like' | 'other'
            $table->boolean('succeeded')->default(true)->index();

            $table->string('signer_wallet', 64)->nullable()->index();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->jsonb('meta')->nullable(); // parsed meta
            $table->jsonb('raw')->nullable();  // raw tx if нужно

            $table->timestamps();

            $table->index(['program_id','kind','slot']);
        });

        // опциональный CHECK для kind (Postgres)
        DB::statement("ALTER TABLE chain_txs ADD CONSTRAINT chain_txs_kind_chk CHECK (kind IN ('post','like','other'))");
    }

    public function down(): void {
        Schema::dropIfExists('chain_txs');
    }
};

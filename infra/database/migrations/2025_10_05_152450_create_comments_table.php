<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('comments', function (Blueprint $table) {
            $table->bigIncrements('id');

            $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();

            $table->foreignId('parent_comment_id')->nullable()
                ->constrained('comments')->cascadeOnDelete();

            $table->text('body');
            $table->timestamps();

            $table->index(['post_id','created_at']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('comments');
    }
};

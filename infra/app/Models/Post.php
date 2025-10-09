<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    protected $fillable = [
        'author_id','root_signature','first_slot','first_block_time',
        'content_short','reply_to_root_signature','likes_count','comments_count'
    ];

    protected $casts = [
        'first_block_time' => 'datetime',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(PostChunk::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLikeTx::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}

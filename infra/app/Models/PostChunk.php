<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostChunk extends Model
{
    protected $fillable = [
        'post_id','chunk_index','tx_signature','slot','block_time','content'
    ];

    protected $casts = [
        'block_time' => 'datetime',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }
}

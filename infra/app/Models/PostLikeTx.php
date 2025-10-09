<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostLikeTx extends Model
{
    protected $table = 'post_likes_tx';

    protected $fillable = [
        'post_id','liker_user_id','liker_wallet','tx_signature','slot','block_time'
    ];

    protected $casts = [
        'block_time' => 'datetime',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function liker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'liker_user_id');
    }
}

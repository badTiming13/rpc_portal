<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChainTx extends Model
{
    protected $fillable = [
        'signature','slot','block_time','program_id','kind','succeeded',
        'signer_wallet','user_id','meta','raw'
    ];

    protected $casts = [
        <'block_time' => 'datetime',
        'succeeded'  => 'boolean',
        'meta'       => 'array',
        'raw'        => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'wallet',
        'wallet_address',

        // on-chain mirror fields
        'onchain_username',
        'onchain_posts_created',
        'onchain_likes_received',
        'onchain_likes_given',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Attribute casting.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'      => 'datetime',
            'password'               => 'hashed',

            // these come back as numbers from python,
            // and we want to treat them as ints in PHP/JSON:
            'onchain_posts_created'  => 'integer',
            'onchain_likes_received' => 'integer',
            'onchain_likes_given'    => 'integer',
        ];
    }
}

# Базовый PHP без Nginx
FROM php:8.3-cli-alpine

# Системные пакеты + PHP-расширения
RUN apk add --no-cache \
      git curl bash \
      libpq-dev \
      libsodium-dev \
      nodejs npm \
  && docker-php-ext-install pdo pdo_pgsql sodium bcmath

# Устанавливаем Composer
RUN curl -sS https://getcomposer.org/installer \
    | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /app

# Ресёрч: Vimeo-лайтбокс, OG-превью и lazy-load без библиотек

Type: research
Status: resolved
Blocked by:

## Question

Как в zero-build статике (чистый HTML/CSS/JS, без npm) сделать:

- лайтбокс с Vimeo-плеером по клику на постер: какой embed использовать (iframe vs Vimeo Player API), параметры ссылки (`autoplay`, `title`, `byline`, `portrait`, `dnd`/`dnt`), как показать постер-обложку поверх и подгружать плеер только по клику;
- поведение на мобильных: автоплей, соотношение сторон, фуллскрин;
- lazy-load постеров (`loading="lazy"`, `srcset`, современные форматы);
- мета-теги и OG-картинку так, чтобы превью корректно разворачивалось в Telegram и VK (включая `og:image` размеры/абсолютный URL).

Источники — первичные: docs Vimeo, MDN, спецификации OG. Результат — markdown-файл с рабочими сниппетами и ссылками на источники; приложить ссылку к тикету.

## Answer

Ресёрч с рабочими сниппетами и ссылками: `.scratch/onepage-videographer/research/vimeo-lightbox.md`.

- **Embed**: для zero-build хватает обычного `<iframe>`, создаваемого в момент клика по постеру (в исходном HTML плеера нет). Vimeo Player API с CDN нужен только для программного контроля/остановки. Ключевые параметры URL: `autoplay=1`, `muted=1`, `title=0`, `byline=0`, `portrait=0`, `dnt=1` (именно `dnt`, не `dnd`), `playsinline=1`; для unlisted-видео обязателен `h=<hash>`.
- **Лайтбокс/мобильные**: нативный `<dialog>` + `showModal()`; `allow="autoplay; fullscreen; picture-in-picture"` и `allowfullscreen` на iframe; соотношение сторон через CSS `aspect-ratio` (16:9 / 9:16); автоплей надёжен при открытии по клику и `muted=1`.
- **Постеры**: `<img loading="lazy" decoding="async" width height srcset sizes>`, современные форматы — `<picture>` с AVIF/WebP и JPEG-фallback.
- **OG/превью**: 4 обязательных тега (`og:title`, `og:type`, `og:image`, `og:url`), все URL абсолютные; Telegram ждёт картинку 1280–2560px, < 5 МБ, > 320px; VK использует те же OG-теги; для Twitter/X добавлен `twitter:card=summary_large_image`.
- **План-гейтинг Vimeo**: `preload`, `controls`, `fullscreen`, `pip`, `color(s)` требуют платного аккаунта; `autoplay`/`muted`/`dnt`/`title`/`byline`/`portrait`/`playsinline` работают на всех видео.
- **Оговорка по VK**: выделенная страница документации VK по Open Graph — JS-приложение и при выгрузке была на «Технические работы»; вывод по VK опирается на собственную OG-разметку страницы VK и спецификацию OG.

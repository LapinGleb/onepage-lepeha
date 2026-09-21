# Vimeo-лайтбокс, lazy-load постеров и OG-превью без сборки

Ресёрч к тикету `02-research-vimeo-lightbox`. Все утверждения — со ссылкой на первичный источник (Vimeo Help/Developer, MDN, ogp.me, Telegram Instant View). Дата выгрузки: 2026-09-21.

## TL;DR

- **Embed**: для zero-build достаточно **обычного `<iframe>`**, который создаётся в момент клика (не лежит в HTML). Vimeo Player API (`player.js` с CDN) нужен только если хочется программно управлять плеером (гарантированный mute+play, `pause`/`destroy` при закрытии, события).
- **Ключевые параметры URL**: `autoplay=1`, `muted=1`, `title=0`, `byline=0`, `portrait=0`, `dnt=1`, `playsinline=1`. Для «unlisted» видео обязателен `h=<hash>` ([player.js README]). Параметр называется `dnt` (Do Not Track), **не** `dnd` — такого у Vimeo нет.
- **Автоплей на мобильных**: браузеры пускают автоплей только если звук выключен, либо было взаимодействие пользователя, либо iframe получил разрешение. Поэтому: открытие по клику (жест) + `muted=1` + `allow="autoplay"` на `<iframe>`.
- **Постеры**: `<img loading="lazy" width height decoding="async" srcset sizes>`, современные форматы — через `<picture>` (AVIF → WebP → JPEG).
- **OG**: 4 обязательных тега (`og:title`, `og:type`, `og:image`, `og:url`), все URL абсолютные. Telegram: картинка 1280–2560px, < 5 МБ, > 320px. VK: те же OG-теги (см. §4).

---

## 1. Лайтбокс с Vimeo-плеером

### 1.1. iframe vs Vimeo Player API

| | Обычный `<iframe>` | Vimeo Player API (`player.js`) |
|---|---|---|
| Подключение | ноль зависимостей | `<script src="https://player.vimeo.com/api/player.js">` ([player.js README](https://github.com/vimeo/player.js)) |
| Автоплей/стоп | `autoplay=1` + удаление iframe из DOM останавливает звук | `player.setMuted(true)`, `player.play()`, `player.destroy()` |
| Управление | только то, что даёт плеер | `requestFullscreen()`, события `play`/`ended`, `loadVideo()` |
| Когда брать | MVP, один сценарий «постер → плеер» | нужен контроль/аналитика/кастомные кнопки |

**Рекомендация**: начать с `<iframe>`, создаваемого по клику. Удаление iframe из DOM (`replaceChildren()`) останавливает воспроизведение — отдельный API не нужен. Player API добавить позже, если понадобится управление.

Источники: Vimeo [Player SDK — embed options](https://developer.vimeo.com/player/sdk/embed), [player.js README](https://github.com/vimeo/player.js).

### 1.2. Параметры URL (первичный источник — Vimeo «About Player Parameters»)

Ниже — только те, что реально нужны лайтбоксу. Пометка «план» — параметр требует аккаунта Starter/Standard/…/Enterprise, иначе игнорируется; остальные работают на всех видео.

| Параметр | Значения | По умолчанию | Смысл | План |
|---|---|---|---|---|
| `autoplay` | `true/false`, `1/0` | `false` | стартовать сразу | все видео |
| `muted` | `true/false`, `1/0` | `false` | без звука при загрузке; обход autoplay-ограничений Chrome/Safari | все видео |
| `title` | `true/false`, `1/0` | из настроек embed | показывать заголовок | все видео |
| `byline` | `true/false`, `1/0` | из настроек embed | показывать автора | все видео |
| `portrait` | `true/false`, `1/0` | из настроек embed | аватар автора | все видео |
| `dnt` | `true/false`, `1/0` | `false` | блокирует сбор сессионных данных/аналитики (часть essential-cookies остаётся) | все видео |
| `playsinline` | `true/false`, `1/0` | `true` | инлайн-воспроизведение на мобильных вместо авто-fullscreen | все видео |
| `preload` | `metadata`, `metadata_on_hover`, `auto`, `auto_on_hover`, `none` | `metadata_on_hover` | что грузить до старта | план |
| `controls` | `true/false`, `1/0` | `true` | `false` = chromeless (кнопок нет) | план |
| `fullscreen` | `true/false`, `1/0` | `true` | кнопка fullscreen | план |
| `pip` | `true/false`, `1/0` | `false` | кнопка picture-in-picture | план |
| `loop` | `true/false`, `1/0` | `false` | повтор | все видео |
| `background` | `true/false`, `1/0` | `false` | выключает контролы, включает loop+autoplay+mute (для фона, не для лайтбокса) | план |
| `color` / `colors` | hex / 1–4 hex через запятую | `00adef` | акцентный цвет / [Primary, Accent, Text, Background] | план |
| `transparent` | `true/false`, `1/0` | `true` | фон iframe прозрачный, иначе чёрный | все видео |
| `#t` | напр. `1m2s` | `0m` | стартовать с таймкода (без `?`, а `#t=`) | все видео |

> `dnd` — опечатка/миф: у Vimeo параметр называется `dnt`. Параметров вроде YouTube-овых `rel=0`, `showinfo=0` у Vimeo нет.

Источник: Vimeo Help Center, «About Player Parameters», https://help.vimeo.com/hc/en-us/articles/12426260232977-Player-parameter-reference

### 1.3. Постер-обложка + подгрузка плеера только по клику

Ключевая идея: в исходном HTML **нет** `<iframe>`. Есть кнопка с постером; iframe создаётся в обработчике клика — значит сеть к Vimeo идёт только тогда. Плюс `<dialog>` даёт нативный оверлей, Esc и фокус-ловушку без библиотек ([MDN `<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)).

**HTML** (лайтбокс один на страницу, карточки рендерятся из массива работ):

```html
<dialog id="lightbox" class="lightbox" aria-label="Видео">
  <button class="lightbox__close" type="button" aria-label="Закрыть">×</button>
  <div class="lightbox__frame" id="lightbox-frame"></div>
</dialog>

<!-- пример карточки: data-атрибуты заполняются из js/main.js -->
<button class="work" type="button"
        data-vimeo="76979871" data-hash="" data-ratio="horizontal"
        data-title="Свадьба Анны и Петра">
  <img
    src="posters/work-1-800.jpg"
    srcset="posters/work-1-480.jpg 480w,
            posters/work-1-800.jpg 800w,
            posters/work-1-1280.jpg 1280w"
    sizes="(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw"
    width="800" height="450"
    loading="lazy" decoding="async"
    alt="Кадр из свадебного фильма «Анна и Пётр»">
  <span class="work__play" aria-hidden="true"></span>
</button>
```

**CSS**:

```css
.work { position: relative; display: block; width: 100%; padding: 0;
        border: 0; background: #000; cursor: pointer; }
.work img { display: block; width: 100%; height: auto;
            aspect-ratio: 16 / 9; object-fit: cover; }

.work__play { position: absolute; inset: 50% auto auto 50%;
              width: 64px; height: 64px; translate: -50% -50%;
              border-radius: 50%; background: rgba(0,0,0,.55);
              border: 1px solid rgba(255,255,255,.8); }

/* лайтбокс */
.lightbox { padding: 0; border: 0; background: transparent;
            max-width: none; max-height: none; }
.lightbox::backdrop { background: rgba(0,0,0,.9); }
.lightbox__close { position: absolute; top: .5rem; right: .75rem; z-index: 2;
                   background: none; border: 0; color: #fff; font-size: 2rem;
                   line-height: 1; cursor: pointer; }

.lightbox__frame { width: min(92vw, 1200px); aspect-ratio: 16 / 9;
                   max-height: 88vh; background: #000; }
.lightbox__frame iframe { display: block; width: 100%; height: 100%; border: 0; }

/* вертикальное видео 9:16 */
.lightbox[data-ratio="vertical"] .lightbox__frame {
  width: min(92vw, calc(88vh * 9 / 16)); aspect-ratio: 9 / 16;
}
```

`aspect-ratio` задаёт соотношение сторон бокса, даже когда размеры родителя меняются ([MDN `aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio)); `object-fit: cover` — для кадрирования постера ([MDN `object-fit`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit)).

**JS** (чистый iframe, без библиотек):

```js
const lightbox = document.getElementById('lightbox');
const frame = document.getElementById('lightbox-frame');

function openLightbox(work) {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: '1',        // гарантирует автоплей в Chrome/Safari
    title: '0',
    byline: '0',
    portrait: '0',
    dnt: '1',
    playsinline: '1',
    // preload: 'metadata' // требует платного аккаунта
  });
  if (work.hash) params.set('h', work.hash); // unlisted-видео

  const iframe = document.createElement('iframe');
  iframe.src = `https://player.vimeo.com/video/${work.vimeo}?${params}`;
  iframe.title = work.title || 'Видео';
  iframe.allow = 'autoplay; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);

  lightbox.dataset.ratio = work.ratio || 'horizontal';
  lightbox.showModal();
}

function closeLightbox() {
  frame.replaceChildren(); // удаление iframe останавливает воспроизведение
  lightbox.close();
}

// клик по карточке (делегирование)
document.querySelector('.works').addEventListener('click', (e) => {
  const card = e.target.closest('.work');
  if (card) openLightbox(card.dataset);
});

// клик по фону или крестику — закрыть
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.closest('.lightbox__close')) closeLightbox();
});
lightbox.addEventListener('cancel', () => frame.replaceChildren()); // Esc
```

**JS-вариант с Player API** (если нужен программный контроль). Player подключается с CDN; для unlisted вместо `id` передаётся `url` с `h`-параметром ([player.js README]):

```html
<script src="https://player.vimeo.com/api/player.js"></script>
```

```js
let player = null;

function openLightboxApi(work) {
  frame.replaceChildren();
  player = new Vimeo.Player(frame, {
    id: Number(work.vimeo),   // для unlisted: url: `https://player.vimeo.com/video/${work.vimeo}?h=${work.hash}`
    autoplay: true,
    muted: true,
    title: false, byline: false, portrait: false,
    dnt: true, playsinline: true
  });
  lightbox.dataset.ratio = work.ratio || 'horizontal';
  lightbox.showModal();
  player.ready()
    .then(() => player.setMuted(true)) // обход autoplay-политики
    .then(() => player.play())
    .catch(() => {});
}

function closeLightboxApi() {
  if (player) { player.destroy(); player = null; } // останавливает звук и убирает iframe
  lightbox.close();
}
```

`player.play()` на iOS/части мобильных нельзя вызвать программно, пока пользователь не нажал play внутри плеера; остальные методы возвращают Promise ([player.js README], раздел `play()`).

### 1.4. Unlisted-видео (приватный хэш)

Если у видео настройки приватности «Unlisted», вместо `id` используется полный URL и **обязателен** параметр `h`:

```
https://player.vimeo.com/video/76979871?h=8272103f6e
```

Источник: Vimeo [Player SDK — basics](https://developer.vimeo.com/player/sdk/basics) и [player.js README].

---

## 2. Поведение на мобильных

### 2.1. Автоплей

MDN: автоплей (в т.ч. `element.play()` вне обработчика ввода) обычно разрешён, если **хотя бы одно**:
- звук отключён (`muted`) или громкость 0;
- пользователь уже взаимодействовал с сайтом (клик/тап/клавиши);
- сайт в allowlist браузера;
- сработала Permissions Policy `autoplay` для iframe.

Иначе воспроизведение, скорее всего, заблокируют. `play()` возвращает Promise, который отклоняется с `NotAllowedError` при запрете. Источник: [MDN Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).

Практика для лайтбокса:
- открытие идёт по клику → есть user gesture;
- всё равно ставим `muted=1`, потому что это самый надёжный путь, а Vimeo по умолчанию показывает кнопку «unmute» (`unmute_button`, по умолчанию `true`);
- на `<iframe>` обязательно `allow="autoplay"`: по умолчанию Permissions Policy `autoplay` = `self`, то есть cross-origin iframe без явного `allow` может быть заблокирован ([MDN Autoplay guide, «The autoplay Permissions Policy»](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)).

Если для видеографа важен звук «с первого кадра» — можно открывать без `muted=1` (`autoplay=1`): где браузер разрешит, играет со звуком; где нет — Vimeo покажет постер и кнопку play. Универсального обхода нет.

### 2.2. Соотношение сторон

- Обёртке задаётся `aspect-ratio` (16 / 9 для горизонтальных, 9 / 16 для вертикальных) — бокс сохраняет пропорции независимо от вьюпорта ([MDN `aspect-ratio`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio)).
- iframe растягивается на 100% обёртки; `object-fit` к iframe не применяется ([MDN `<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)).
- Для вертикального видео держим ограничение по высоте (`max-height: 88vh`), иначе «портрет» выше экрана.

### 2.3. Фуллскрин

- Встраивание в fullscreen разрешает атрибут `allowfullscreen` на iframe; это legacy-форма `allow="fullscreen *"` ([MDN `<iframe>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)).
- Fullscreen-запрос должен идти из обработчика события, иначе браузер откажет; при неудаче — событие `fullscreenerror` ([MDN Fullscreen API guide](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide)).
- Vimeo-параметр `playsinline` (по умолчанию `true`) не даёт мобильному плееру автоматически уходить в fullscreen ([Vimeo Player Parameters]).
- Программный fullscreen: `player.requestFullscreen()` / `player.exitFullscreen()` ([player.js README]).
- Кнопка fullscreen у Vimeo включается параметром `fullscreen` (по умолчанию `true`, требует платного плана); для кастомной кнопки — Fullscreen API/SDK.

---

## 3. Lazy-load постеров

`loading` на `<img>`/`<iframe>` откладывает загрузку off-screen ресурсов до приближения к вьюпорту ([MDN Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)). Прямо из доки про `<img>` ([MDN `<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)):

- `loading="lazy"` — отложенная загрузка; **обязательно** указывать `width`/`height`, иначе не загруженная картинка имеет размеры 0 и провоцирует layout shift;
- `width`/`height` задают intrinsic size → браузер резервирует место и знает aspect ratio до загрузки;
- `decoding="async"` — не блокировать рендер декодированием;
- `srcset` + `sizes` — выбор подходящего размера (resolution switching); `sizes` нужен только вместе с ширинами `w` в `srcset` ([MDN `<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img), [MDN Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images));
- для art direction (разный кроп на мобильном/десктопе) — `<picture>` + `<source media>` ([MDN Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)).

Современные форматы: AVIF/WebP жмутся лучше PNG/JPEG, но AVIF менее поддерживается, поэтому для AVIF рекомендуется fallback через `<picture>`; порядок `source` — от нового к старому, в конце `<img>` как фallback ([MDN Image types](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types)):

```html
<picture>
  <source type="image/avif" srcset="posters/work-1-800.avif 800w, posters/work-1-1280.avif 1280w"
          sizes="(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw">
  <source type="image/webp" srcset="posters/work-1-800.webp 800w, posters/work-1-1280.webp 1280w"
          sizes="(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw">
  <img src="posters/work-1-800.jpg"
       srcset="posters/work-1-480.jpg 480w, posters/work-1-800.jpg 800w, posters/work-1-1280.jpg 1280w"
       sizes="(min-width: 1000px) 33vw, (min-width: 640px) 50vw, 100vw"
       width="800" height="450" loading="lazy" decoding="async"
       alt="Кадр из свадебного фильма «Анна и Пётр»">
</picture>
```

Постер hero (первый экран) лениво грузить не нужно — наоборот, `loading="eager"` и `fetchpriority="high"`; `loading="lazy"` полезен для сетки работ ниже сгиба ([MDN `<img>`, `fetchpriority`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)).

Если постеры хочется брать прямо с Vimeo, у официального oEmbed-эндпоинта есть `thumbnail_url` ([Vimeo oEmbed](https://developer.vimeo.com/api/oembed)); но проще хранить `poster` в массиве работ.

---

## 4. Мета-теги и Open Graph (Telegram, VK, Twitter/X)

### 4.1. Что обязательно

Спецификация Open Graph: 4 обязательных свойства — `og:title`, `og:type`, `og:image`, `og:url`; рекомендуемые — `og:description`, `og:site_name`, `og:locale`. У `og:image` есть структурированные свойства: `og:image:url`, `og:image:secure_url`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`. Все URL — типа `http://`/`https://` (абсолютные), относительные не подходят ([ogp.me](https://ogp.me/)).

### 4.2. Telegram

Первичные источники — Telegram Instant View: [Manual](https://instantview.telegram.org/docs) и [Checklist](https://instantview.telegram.org/checklist).

- У превью ссылки есть поля `description`, `image_url`, `document_url`, `site_name` (Manual, «Instant View Format»).
- Checklist 3.2 «Link preview»: превью **должно** включать фото, если на странице есть подходящая картинка; нужен description; для description следует брать текст из метаданных, в т.ч. **OpenGraph**; `site_name` должен совпадать с именем сайта, которое видит пользователь. «Желательно делать корректные превью даже для страниц, которые не генерируют Instant View».
- Checklist 6.2.1 «Image quality»: оптимальное разрешение картинки **1280–2560px**; изображения **> 5 МБ** не загрузятся; если достать можно только картинку **< 320px**, превью будет плохим. В IV 2.1 из `srcset` автоматически берётся лучший вариант (не выше 2560px).
- Telegram-боты: у `LinkPreviewOptions` есть `is_disabled`, `prefer_small_media`, `prefer_large_media`, но это про отправку сообщений ботом, а не про разметку страницы ([Bot API, LinkPreviewOptions](https://core.telegram.org/bots/api#linkpreviewoptions)).

Вывод: для Telegram достаточно корректных OG-тегов с абсолютными URL и картинкой ~1280px по длинной стороне, < 5 МБ.

### 4.3. VK

- VK использует те же Open Graph-теги. Подтверждение из первичного артефакта: собственная страница VK для разработчиков отдаёт в `<head>` ровно такой набор —
  `og:title`, `og:site_name`, `og:description`, `og:url`, `og:image`, `og:image:width`, `og:image:height` (картинка `520×288`). Источник: HTML страницы https://dev.vk.ru/ru/api/open-graph (получен 2026-09-21).
- Ограничение: выделенная страница VK-документации по Open Graph — клиентское JS-приложение (`dev.vk.com/ru/api/open-graph` → `dev.vk.ru/ru/api/open-graph`); при выгрузке отдавался экран «Технические работы», поэтому цитаты оттуда привести нельзя. Практический вывод — следовать спецификации OG, как это делает сам VK: абсолютный `og:image` + явные `og:image:width`/`og:image:height`.

### 4.4. Twitter/X

Отдельный протокол. Минимум: `twitter:card` (`summary_large_image` для крупного превью), `twitter:title`, `twitter:description`, `twitter:image`. Источник: X Cards docs — https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image (на этой же странице видно и `og:type`, и `twitter:card` в её собственном `<head>`). Точные лимиты размеров/форматов заданы в доке X и могут меняться.

### 4.5. Готовый `<head>` (RU-одностраничник)

```html
<!doctype html>
<html lang="ru" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Иван Лепеха — видеограф | Свадьбы и события</title>
  <meta name="description" content="Съёмка свадеб и событий. Кинематографичные фильмы, живые эмоции.">
  <link rel="canonical" href="https://lapingleb.github.io/onepage-lepeha/">

  <!-- Open Graph: Telegram, VK -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Иван Лепеха — видеограф">
  <meta property="og:title" content="Иван Лепеха — видеограф | Свадьбы и события">
  <meta property="og:description" content="Съёмка свадеб и событий. Кинематографичные фильмы, живые эмоции.">
  <meta property="og:url" content="https://lapingleb.github.io/onepage-lepeha/">
  <meta property="og:image" content="https://lapingleb.github.io/onepage-lepeha/img/og-cover.jpg">
  <meta property="og:image:secure_url" content="https://lapingleb.github.io/onepage-lepeha/img/og-cover.jpg">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Кадр из свадебного фильма">
  <meta property="og:locale" content="ru_RU">

  <!-- Twitter/X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Иван Лепеха — видеограф">
  <meta name="twitter:description" content="Съёмка свадеб и событий.">
  <meta name="twitter:image" content="https://lapingleb.github.io/onepage-lepeha/img/og-cover.jpg">
</head>
<body>
```

Про размер `og:image`: ogp.me задаёт только поля `og:image:width`/`height` и требует абсолютный URL, но не диктует размер. Практический выбор — **1200×630** (пропорция 1.91:1, используется большинством крупных превью), при этом Telegram гарантированно хорошо рендерит 1280–2560px и ломается на > 5 МБ (см. §4.2); VK для своей страницы использует 520×288. Файл — JPEG или PNG, публично доступный по HTTPS, без авторизации. `og:url` должен быть каноническим.

---

## Sources

- Vimeo Help Center — About Player Parameters: https://help.vimeo.com/hc/en-us/articles/12426260232977-Player-parameter-reference
- Vimeo Developer — Player SDK, Embed options: https://developer.vimeo.com/player/sdk/embed
- Vimeo Developer — Player SDK, Basics (unlisted `h`): https://developer.vimeo.com/player/sdk/basics
- Vimeo Player API (player.js) README: https://github.com/vimeo/player.js
- MDN — Autoplay guide for media and Web Audio APIs: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN — Lazy loading: https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading
- MDN — `<img>` (loading, decoding, width/height, srcset, sizes, fetchpriority): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img
- MDN — Responsive images in HTML: https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
- MDN — `<picture>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture
- MDN — `aspect-ratio`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/aspect-ratio
- MDN — `object-fit`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/object-fit
- MDN — Fullscreen API guide: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide
- MDN — `<iframe>` (allow, allowfullscreen, loading): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- MDN — `<dialog>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- MDN — Image file type and format guide (AVIF/WebP, fallback): https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
- The Open Graph protocol (ogp.me): https://ogp.me/
- Telegram Instant View — Manual: https://instantview.telegram.org/docs
- Telegram Instant View — Checklist (link preview, image quality): https://instantview.telegram.org/checklist
- Telegram Bot API — LinkPreviewOptions: https://core.telegram.org/bots/api#linkpreviewoptions
- VK — developer portal (собственная OG-разметка страницы, `og:image` 520×288); Open Graph-страница — JS-приложение, при выгрузке была недоступна: https://dev.vk.ru/ru/api/open-graph
- X Developer Platform — Cards, Summary Card with Large Image: https://developer.x.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image

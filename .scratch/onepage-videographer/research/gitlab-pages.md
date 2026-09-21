# Публикация статики без сборки на GitLab Pages

Репозиторий: `LapinGleb/onepage-lepeha` (GitLab.com).
Целевой сайт: чистый `index.html` + `css/` + `js/` + `images/`, без npm и без шага сборки.

Все утверждения ниже подкреплены первичными источниками (документация GitLab Pages / справочник
`.gitlab-ci.yml` / исходники демона GitLab Pages). Ссылки — в разделе [Sources](#sources).

---

## TL;DR

- Нужен один файл `.gitlab-ci.yml` в корне репозитория с job, у которого есть свойство `pages`.
- Файлы сайта должны попасть в каталог, который публикуется. По умолчанию это `public/`.
- С версии GitLab 17.10 путь публикации **автоматически** добавляется в `artifacts:paths`;
  вручную `artifacts:paths` больше не обязателен. Старая схема (`artifacts:paths` + job с именем
  `pages`) работает, но **deprecated**.
- Лишние файлы (`.nojekyll` и т.п.) **не нужны**: GitLab Pages не запускает Jekyll.
- Обязателен непустой `index.html` в корне публикуемого каталога.
- Кастомный домен и Let's Encrypt на GitLab.com доступны на Free; обязательна DNS-верификация
  владения доменом.

---

## 1. Минимальный `.gitlab-ci.yml` (актуальный синтаксис)

### 1.1. Готовый файл

Рекомендуемый вариант для этого репозитория (файлы сайта лежат в корне: `index.html`, `css/`,
`js/`, `images/`). Job копирует содержимое корня в `public/`:

```yaml
# Публикует статический сайт (index.html, css/, js/, images/) на GitLab Pages.
# Сборки нет: файлы переносятся как есть в публикуемый каталог public/.
deploy-pages:
  stage: deploy
  script:
    # .public-обёртка нужна, чтобы cp не копировал public/ сам в себя (официальный приём из документации).
    - mkdir -p .public
    - cp -r * .public
    - rm -rf .public/.public
    - mv .public public
  pages: true          # публикует public/; на GitLab 17.10+ путь сам попадает в artifacts:paths
  artifacts:
    paths:
      - public           # нужен для GitLab < 17.10; на 17.10+ можно опустить
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

Важно: `cp -r *` не копирует dot-файлы, поэтому `.gitlab-ci.yml`, `.git/`, `.scratch/` и
`.idea/` в артефакт не попадут. `README.md` (если появится) попадёт и будет публично доступен —
при желании замените копирование на явный список (вариант B ниже).

**Вариант B — явный список** (надёжнее по составу; требует, чтобы элементы уже существовали):

```yaml
deploy-pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r index.html css js images public/
  pages: true
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

**Вариант C — `public/` закоммичен в репозиторий.** Официальный пример GitLab
(`pages/plain-html`) держит готовый `public/` в репозитории, а job только объявляет публикацию
(скрипт-«заглушка»). Тогда `.gitlab-ci.yml` ещё короче:

```yaml
deploy-pages:
  stage: deploy
  script:
    - echo "The site will be deployed to $CI_PAGES_URL"
  pages: true
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
```

### 1.2. Как это читается

- `pages: true` объявляет job публикующим и публикует каталог `public`. Альтернативно
  `pages: { publish: <dir> }` — для другого каталога.
- `stage: deploy` — не обязателен технически (без `stage` job попадёт в `test`), но так принято
  и читаемо.
- `rules` ограничивает деплой дефолтной веткой. `$CI_DEFAULT_BRANCH` — предопределённая
  переменная, поэтому не хардкодим `main`.

### 1.3. `artifacts:paths` vs `pages.publish` — что актуально и с какой версии

- Ключевое слово `pages` можно задавать как `true` (публикует `public`) либо хэшем настроек,
  например `pages.publish`. Job **должен** иметь непустой `index.html` в корне публикуемого
  каталога, иначе деплой падает. ([S2], [S3])
- `pages.publish` переехал **под** ключ `pages` в **GitLab 17.9**; тогда же:
  - верхнеуровневый `publish` объявлен **deprecated**;
  - в `pages.publish` разрешили переменные. ([S2], [S3], [S4])
- В **GitLab 17.10+** путь из `pages.publish` (или `public` по умолчанию, если `publish` не задан)
  **автоматически добавляется в `artifacts:paths`** — вручную дублировать не нужно. ([S2], [S3])
- Имя job `pages` **deprecated**; пользовательские имена job стали GA в **GitLab 17.6**. Поэтому
  используем своё имя (`deploy-pages`) и свойство `pages`. ([S4], [S5])
- Старый синтаксис (`job pages` + `artifacts: paths: - public`) продолжает работать — именно так
  устроен официальный пример `pages/plain-html` (последнее изменение 2024-01-10), но он
  deprecated. ([S4], [S6])

На GitLab.com сейчас актуальная версия линии 17.10+ (в исходниках `gitlab-pages` на дату
ресёрча — changelog 19.4.0 от 2026-09-16, [S7]), поэтому новый синтаксис безопасен.

### 1.4. Дополнительно (опционально)

Safari требует поддержку Range-запросов для медиа. Документация рекомендует для этого в Pages-job:

```yaml
variables:
  FF_USE_FASTZIP: "true"
  ARTIFACT_COMPRESSION_LEVEL: "fastest"
```
([S2] → Troubleshooting → «Cannot play media content on Safari»)

Пред-сжатие ассетов (`.br`/`.gz`) не обязательно: Pages умеет отдавать сжатые версии, если они
есть рядом с оригиналом. Для простого сайта пропускаем. ([S2] → «Serving compressed assets»)

---

## 2. Структура файлов и нужен ли `index.html` в корне

- Публикуется содержимое **каталога публикации** (`public/` по умолчанию). Именно оно становится
  корнем сайта. ([S2], [S8])
- Требуется **непустой `index.html` в корне каталога публикации**; без него job `pages:deploy`
  падает. Если `index.html` нет, но есть `test.html`, сайт откроется только по полному пути. ([S2])
- Корневой `index.html` в репозитории сам по себе не обязателен — важно, чтобы он оказался в
  публикуемом каталоге. Наш job копирует корень репозитория в `public/`, поэтому `index.html` в
  корне репозитория — это ровно то, что нужно. ([S2], [S8])
- `.nojekyll` **не нужен**: GitLab Pages не обрабатывает Jekyll, а просто отдаёт статику; в
  официальном примере для plain HTML никаких `.nojekyll` нет. ([S2] → «.gitlab-ci.yml for plain
  HTML websites», [S6])
- Необязательные файлы в корне `public/`:
  - `404.html`, `403.html` — кастомные страницы ошибок ([S8] → «Custom error codes pages»);
  - `_redirects` — правила редиректов/rewrite в стиле Netlify (поддерживаются `301`, `302`, `200`,
    splats, placeholders; `_headers` **не поддерживается**) ([S9]).
- Итоговая раскладка репозитория:

```text
onepage-lepeha/
├── .gitlab-ci.yml
├── index.html
├── css/
│   └── ...
├── js/
│   └── ...
└── images/
    └── ...
```

После job в артефакте получается `public/index.html`, `public/css/...` и т.д.

Относительные ссылки: для project Pages (URL вида `https://<namespace>.gitlab.io/<project>/`)
статик-генераторы обычно требуют base URL, но чистому HTML `baseurl` не нужен; используйте
абсолютные или корректные относительные пути. ([S1])

---

## 3. Кастомный домен + HTTPS

Источники: [S10] (Custom domains), [S11] (Let's Encrypt), [S12] (DNS concepts).

### 3.1. Предусловия

- Pages-сайт уже задеплоен и открывается на дефолтном домене `*.gitlab.io`. ([S10])
- Есть свой домен (`example.com`) или поддомен (`subdomain.example.com`) и доступ к DNS-панели.
  ([S10])
- Для корневого домена нужны записи `A`/`AAAA` и `TXT`; для поддомена — `ALIAS`/`CNAME` и `TXT`.
  ([S10])

### 3.2. Шаги

1. **DNS-записи для домена.** Для GitLab.com фиксированные адреса:
   - корневой домен: `A 35.185.44.232` и (при наличии IPv6) `AAAA 2600:1901:0:7b8a::`;
   - поддомен: `ALIAS`/`CNAME` → `<namespace>.gitlab.io` (без пути и без хвостовых символов).
   ([S10])
2. **Добавить домен в GitLab:** проект → **Deploy → Pages → New Domain**, ввести домен.
   Оставить включённым **Automatic certificate management using Let's Encrypt**. ([S10], [S11])
3. **TXT-верификация владения.** GitLab покажет код. Добавить запись:
   - имя `_gitlab-pages-verification-code.<домен>` (для корня) или
     `_gitlab-pages-verification-code.<subdomain>` (для поддомена);
   - тип `TXT`, значение `gitlab-pages-verification-code=<код>`.
   Некоторые провайдеры (например, Cloudflare) сами дописывают домен — тогда вводите только
   `_gitlab-pages-verification-code`. ([S10])
4. **Подтвердить владение:** Deploy → Pages → карандаш у домена → **Retry verification**.
   DNS может распространяться до 24 часов; до этого домен отдаёт 404. Верификационную TXT-запись
   оставлять на месте — домен периодически перепроверяется. ([S10])
5. **HTTPS.** Включить чекбокс **Force HTTPS (requires valid certificates)** — HTTP будет
   редиректиться на HTTPS (301). Let's Encrypt-сертификат GitLab получает и продлевает сам;
   выпуск может занять до часа. ([S10], [S11])
6. **Опционально — Primary domain:** в Deploy → Pages выбрать основной домен, тогда все запросы
   308-редиректятся на него. ([S13])

### 3.3. Ограничения и подводные камни

- Верификация домена на GitLab.com **обязательна**. Непроверенные домены удаляются через 7 дней.
  ([S10])
- Не используйте apex-`CNAME` для корневого домена — только `A`/`AAAA`. ([S10])
- Если у домена есть `CAA`-запись, она должна разрешать `letsencrypt.org`. ([S11])
- Для поддоменов: не добавлять лишний `AAAA`, если он мешает выпуску LE (документация прямо
  просит «make sure your domain doesn't have an `AAAA` record» при ошибках LE). ([S11])
- Ограничение HTTPS «subdomains of subdomains»: если namespace/группа содержит точку
  (например, `foo.bar`), то `https://foo.bar.example.io` не работает — только HTTP. ([S8])

### 3.4. Ограничения Free-тарифа на GitLab.com

- GitLab Pages доступен на тарифах **Free, Premium, Ultimate**; кастомные домены и TLS тоже.
  ([S2], [S10])
- На GitLab.com (настройки, отличающиеся от Self-Managed): **максимальный размер сайта 1 GB**;
  **до 150 кастомных доменов** на один Pages-сайт; поддержка кастомных доменов и TLS — да.
  Размер сайта ограничен максимальным размером артефакта (настройка CI/CD). ([S14])
- Let's Encrypt-интеграция на GitLab.com включена и доступна. ([S11])
- Сам домен и DNS — внешние расходы (регистратор), GitLab за Pages/домен/HTTPS не берёт плату.
- По умолчанию новые проекты используют **unique domain** (например, `project-123456.gitlab.io`);
  это можно выключить в Deploy → Pages. ([S13])

---

## 4. Кэш-заголовки и поведение 404

### 4.1. Кэш-заголовки

- Отдача файлов с диска: демон Pages сам ставит заголовки
  `Cache-Control: max-age=600` и `Expires` = «сейчас + 10 минут», плюс `ETag`, вычисляемый из SHA
  деплоя. Если включён access control, кэш-заголовки не ставятся. ([S15] `internal/serving/disk/reader.go`)
- Отдача из ZIP-архива (object storage): `Cache-Control: max-age=3600`. ([S16] `internal/artifact/artifact.go`)
- **На GitLab.com нельзя задать собственные заголовки для проекта**: файла `_headers` нет,
  поддерживается только `_redirects` (Netlify-стиль). ([S9])
- Только администратор **Self-Managed** может добавить глобальные заголовки через
  `gitlab_pages['headers']` (например, HSTS). ([S17])
- Практический вывод для GitLab.com: кэш ~10 минут у страниц; для моментального обновления ассетов
  применяйте **fingerprint в имени файла** (`style.<hash>.css`) — смена URL обходит кэш, а `ETag`
  меняется вместе с деплоем.

### 4.2. 404 / 403

- Кастомные страницы: положить `403.html` и `404.html` в корень `public/`. ([S8])
- Порядок поиска `404.html`:
  - project Pages (URL `/project-slug/...`): сначала `/project-slug/404.html`, затем `/404.html`;
  - user/group Pages (URL `/...`): `/404.html`;
  - кастомный домен: только `/404.html`. ([S8])
- Разрешение «неоднозначных» URL: для URL без расширения Pages ищет `index.html` в каталоге;
  `/data` → 302 на `/data/`; `/data/` → `public/data/index.html`; если файла нет, но есть файл с
  `.html`, он будет отдан. При отсутствии — 404-страница. ([S8])
- Известная проблема: extensionless URL с завершающим `/` ломает относительные ссылки — используйте
  абсолютные URL или URL с расширением. ([S8])

---

## 5. Пошаговый гайд по публикации

1. Убедиться, что в репозитории есть непустой `index.html` (в корне), а также `css/`, `js/`,
   `images/`. ([S2])
2. Добавить в корень репозитория `.gitlab-ci.yml` из раздела 1.1. ([S2])
3. Закоммитить и запушить в дефолтную ветку (при необходимости — через MR). Пайплайн создаст job
   `deploy-pages`, который соберёт `public/` и опубликует его. ([S2])
4. После успешного пайплайна открыть **Deploy → Pages** — там будет URL вида
   `https://<namespace>.gitlab.io/<project-slug>` (или unique domain). Проверить, что сайт
   открывается. ([S1], [S2])
5. Если нужен свой домен — выполнить шаги 3.2 (DNS → New Domain → TXT → Retry verification →
   Force HTTPS). ([S10], [S11])
6. Опционально добавить `404.html` в корень и `_redirects` при необходимости. ([S8], [S9])

---

## Sources

- [S1] GitLab Pages default domain names and URLs — https://docs.gitlab.com/user/project/pages/getting_started_part_one/
- [S2] GitLab Pages settings (requirements, plain HTML `.gitlab-ci.yml`, compressed assets, ambiguous URLs, 404, Safari) — https://docs.gitlab.com/user/project/pages/introduction/
- [S3] `.gitlab-ci.yml` reference: `pages`, `pages.publish` — https://docs.gitlab.com/ci/yaml/#pages
- [S4] Deprecated keywords: `publish` keyword and `pages` job name — https://docs.gitlab.com/ci/yaml/deprecated_keywords/#publish-keyword-and-pages-job-name-for-gitlab-pages
- [S5] GitLab Pages: user-defined job names (GA in 17.6) — https://docs.gitlab.com/user/project/pages/#user-defined-job-names
- [S6] Official plain-HTML example project — https://gitlab.com/pages/plain-html
- [S7] `gitlab-pages` source, changelog 19.4.0 (2026-09-16) — https://gitlab.com/gitlab-org/gitlab-pages
- [S8] GitLab Pages settings (custom error pages, subdomains of subdomains) — https://docs.gitlab.com/user/project/pages/introduction/
- [S9] GitLab Pages redirects (`_redirects`, no `_headers`) — https://docs.gitlab.com/user/project/pages/redirects/
- [S10] GitLab Pages custom domains — https://docs.gitlab.com/user/project/pages/custom_domains_ssl_tls_certification/
- [S11] GitLab Pages Let's Encrypt certificates — https://docs.gitlab.com/user/project/pages/custom_domains_ssl_tls_certification/lets_encrypt_integration/
- [S12] GitLab Pages DNS records — https://docs.gitlab.com/user/project/pages/custom_domains_ssl_tls_certification/dns_concepts/
- [S13] GitLab Pages (primary domain, unique domains, expiring deployments) — https://docs.gitlab.com/user/project/pages/
- [S14] GitLab.com settings (Pages: max site size 1 GB, 150 custom domains) — https://docs.gitlab.com/user/gitlab_com/
- [S15] `gitlab-pages/internal/serving/disk/reader.go` (Cache-Control `max-age=600`, ETag) — https://gitlab.com/gitlab-org/gitlab-pages/-/blob/master/internal/serving/disk/reader.go
- [S16] `gitlab-pages/internal/artifact/artifact.go` (Cache-Control `max-age=3600`) — https://gitlab.com/gitlab-org/gitlab-pages/-/blob/master/internal/artifact/artifact.go
- [S17] GitLab Pages administration (`gitlab_pages['headers']`, HSTS) — https://docs.gitlab.com/administration/pages/

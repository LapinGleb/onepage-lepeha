# Подключить деплой на GitLab Pages

Type: task
Status: open
Blocked by: 03, 06

## Question

Настроить публикацию по ресёрчу из тикета «Ресёрч: публикация статики на GitLab Pages»:

- добавить `.gitlab-ci.yml`, собирающий статику в артефакт `public/`;
- задеплоить текущий каркас, дождаться зелёного пайплайна;
- проверить публичный URL на десктопе и мобе;
- при наличии домена у друга — описать шаги подключения (иначе отложить в туман карты).

Ответ — рабочий URL, статус пайплайна, что осталось (кастомный домен).

## Answer

Добавлен `.gitlab-ci.yml` — один job `deploy-pages` (свойство `pages: true`). Без сборки копирует
`index.html`, `css/`, `js/` и, если появится, `images/` в публикуемый каталог `public/`; деплой
только с дефолтной ветки через `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH` (без хардкода `main`).
`prototype/` и `.scratch/` в артефакт не попадают и публично недоступны.

Проверено в этой сессии:

- конфиг прошёл **GitLab CI Lint** — `valid: true`, без errors и warnings;
- локальная симуляция job: в артефакте ровно `public/index.html` (непустой), `public/css/styles.css`,
  `public/js/main.js`; `prototype/`, `.scratch/`, `.gitlab-ci.yml` отсутствуют.

**Статус пайплайна и рабочий URL — не подтверждены:** из этого окружения нет доступа к `origin`
(`git ls-remote` → `Permission denied (publickey)`), поэтому пуш и запуск пайплайна не выполнены.
Остаётся сделать вручную:

1. `git push -u origin main`;
2. дождаться зелёного job `deploy-pages` (Deploy → Pipelines);
3. открыть Deploy → Pages — URL вида `https://<namespace>.gitlab.io/onepage-lepeha/`, проверить на
   десктопе и в мобе.

**Кастомный домен:** у друга домена нет (раздел 5 брифа без ответа) → остаётся в тумане карты.
Когда домен появится — шаги в `research/gitlab-pages.md` §3: DNS-записи (`A 35.185.44.232` /
`AAAA 2600:1901:0:7b8a::` для корня либо `CNAME`→`<namespace>.gitlab.io` для поддомена), `TXT`
для верификации владения, затем Deploy → Pages → New Domain и Force HTTPS; Let's Encrypt на Free
включается автоматически.

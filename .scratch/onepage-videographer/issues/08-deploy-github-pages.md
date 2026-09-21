# Подключить деплой на GitHub Pages

Type: task
Status: open
Blocked by: 06

## Question

Хостинг — **GitHub** (репозиторий `LapinGleb/onepage-lepeha`), поэтому публиковать статику нужно
на GitHub Pages, а не на GitLab Pages (ресёрч `03` был про GitLab и устарел).

- добавить workflow GitHub Actions, собирающий статику без сборки и деплоящий её на Pages;
- задеплоить текущий каркас, дождаться зелёного workflow;
- проверить публичный URL на десктопе и мобе;
- при наличии домена у друга — описать шаги подключения (иначе отложить в туман карты).

Ответ — рабочий URL, статус workflow, что осталось (кастомный домен).

## Answer

Деплой переведён на **GitHub Actions + GitHub Pages**. `.gitlab-ci.yml` удалён, добавлен
`.github/workflows/pages.yml` (job `deploy`):

- шаг `Assemble site` копирует `index.html`, `css/`, `js/` и, если появится, `img/` (именно так —
  сайт ссылается на `img/og-cover.jpg` и `../img/hero.jpg`) в `_site/`; `prototype/` и `.scratch/`
  в артефакт не попадают и публично недоступны;
- `actions/checkout@v7`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` →
  `actions/deploy-pages@v5` — официальный флоу; Jekyll не запускается, `.nojekyll` не нужен;
- триггеры: push в `main` и ручной запуск (`workflow_dispatch`); права `pages: write` + `id-token: write`,
  конкурентность сгруппирована (`concurrency: pages`).

Проверено в этой сессии:

- workflow-файл — валидный YAML;
- локальная симуляция шага сборки: без каталога картинок артефакт содержит ровно `_site/index.html`
  (непустой), `_site/css/styles.css`, `_site/js/main.js`; `prototype/` и `.scratch/` отсутствуют.
  Каталог `img/` при появлении попадёт в артефакт (условие `if [ -d img ]`).

**Статус workflow и рабочий URL — не подтверждены:** из этого окружения нет доступа к `origin`
(`git ls-remote` → `Permission denied (publickey)`), поэтому пуш и запуск workflow не выполнены.
Остаётся сделать вручную:

1. Settings → Pages → **Source: GitHub Actions** (иначе `deploy-pages` не опубликует сайт);
2. запушить в `main`, дождаться зелёного workflow «Deploy to GitHub Pages» (вкладка Actions);
3. открыть `https://lapingleb.github.io/onepage-lepeha/` и проверить на десктопе и в мобе
   (в `index.html` канонический/OG-URL уже переставлены на этот адрес).

**Кастомный домен:** домен у друга неизвестен — раздел 5 брифа без ответа (не «нет»), поэтому
остаётся в тумане карты. Когда появится — Settings → Pages → Custom domain: DNS-запись (`A` на
адреса GitHub для корня либо `CNAME`→`lapingleb.github.io` для поддомена), затем подтверждение
владения (TXT-запись, точные значения GitHub покажет в UI) и **Enforce HTTPS**.

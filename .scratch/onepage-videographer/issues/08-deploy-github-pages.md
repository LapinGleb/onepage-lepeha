# Подключить деплой на GitHub Pages

Type: task
Status: resolved
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

**Задеплоено:** Pages включён (Settings → Pages → Source: **GitHub Actions**), workflow
«Deploy to GitHub Pages» отработал, сайт открывается на
**https://lapingleb.github.io/onepage-lepeha/**.

Проверено снаружи: `index.html` и ассеты отдаются — `css/styles.css` и `js/main.js` приходят с
корректным содержимым (стили и скрипт видны в ответе), то есть относительные пути под
`/onepage-lepeha/` работают. Осталось eyeball-проверить на десктопе и в мобе: контент пока на
заглушках, лайтбокс крутит демо-ролик Vimeo.

Первый запуск падал на `configure-pages` с «Get Pages site failed … Not Found», пока Pages не был
включён; `enablement: true` не помогает — требует отдельный PAT, штатным `GITHUB_TOKEN` Pages не
включить. (Если репозиторий приватный, GitHub Pages на бесплатном плане недоступен.)

**Кастомный домен:** домен у друга неизвестен — раздел 5 брифа без ответа (не «нет»), поэтому
остаётся в тумане карты. Когда появится — Settings → Pages → Custom domain: DNS-запись (`A` на
адреса GitHub для корня либо `CNAME`→`lapingleb.github.io` для поддомена), затем подтверждение
владения (TXT-запись, точные значения GitHub покажет в UI) и **Enforce HTTPS**.

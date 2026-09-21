# Ресёрч: публикация статики на GitLab Pages

Type: research
Status: resolved
Blocked by:

## Question

Как опубликовать статический сайт **без сборки** из репозитория `LapinGleb/onepage-lepeha` на GitLab Pages:

- минимальный `.gitlab-ci.yml` для статики: job `pages`, артефакт каталога `public/`, как разложить `index.html`, `css/`, `js/`, картинки;
- нужны ли `index.html` в корне и дополнительные файлы (`.nojekyll` и т.п.);
- как прикрутить кастомный домен и HTTPS (шаги, DNS-записи), ограничения бесплатного тарифа;
- кэш-заголовки и базовое поведение 404.

Источники — первичные: docs GitLab Pages. Результат — markdown-файл с готовым `.gitlab-ci.yml` и пошаговой инструкцией; приложить ссылку к тикету.

## Answer

> **Обновление:** хостинг переехал на **GitHub**; актуальный деплой — тикет
> «Подключить деплой на GitHub Pages» (`08-deploy-github-pages.md`). Ответ ниже — исторический.

Готовый `.gitlab-ci.yml` и пошаговый гайд — в исследовании
`.scratch/onepage-videographer/research/gitlab-pages.md`.

Кратко:

- Публикация статики без сборки — один job с свойством `pages: true`, который кладёт файлы в
  `public/`. Актуальный синтаксис: `pages: true` (или `pages.publish: <dir>`); верхнеуровневый
  `publish` и job с именем `pages` устарели. С GitLab 17.10 путь публикации сам добавляется в
  `artifacts:paths`, поэтому дублировать его не нужно.
- Обязателен непустой `index.html` в корне публикуемого каталога. `.nojekyll` не нужен — GitLab
  Pages не запускает Jekyll.
- Кастомный домен: DNS-записи (`A 35.185.44.232` / `AAAA 2600:1901:0:7b8a::` для корня,
  `CNAME`→`<namespace>.gitlab.io` для поддомена) + `TXT` для верификации владения, затем
  Deploy → Pages → New Domain и Force HTTPS. Let's Encrypt включается автоматически. Всё доступно
  на Free; на GitLab.com лимиты: сайт до 1 GB, до 150 кастомных доменов.
- Кэш: демон отдаёт `Cache-Control: max-age=600` (+ `ETag` по SHA деплоя); на GitLab.com свои
  заголовки задать нельзя — для обновления ассетов использовать fingerprint в имени файла.
  404/403 настраиваются файлами `404.html`/`403.html` в корне `public/`.

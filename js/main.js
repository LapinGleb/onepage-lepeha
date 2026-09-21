/* ==========================================================================
   Точка входа. Контент работ правится руками в массиве WORKS ниже.
   ========================================================================== */

/**
 * Работы. Одна строка = одна карточка в ленте.
 *   title  — название на карточке;
 *   meta   — подпись (тип съёмки · год);
 *   vimeo  — id или ссылка Vimeo (напр. "76979871" или
 *            "https://vimeo.com/76979871"); пусто — карточка неактивна;
 *   poster — путь к обложке (пусто — градиентная заглушка);
 *   hash   — приватный хэш для unlisted-видео (необязательно);
 *   ratio  — "horizontal" (16:9, по умолчанию) или "vertical" (9:16).
 *
 * Сейчас vimeo — демонстрационный ролик Vimeo (лайтбокс работает на заглушках).
 * Заменить реальным контентом: тикет «Заменить заглушки реальным контентом».
 */
var WORKS = [
  { title: "Аня и Дмитрий",     meta: "Свадьба · 2024",      vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" },
  { title: "Рассвет над Волгой", meta: "Love story · 2024",  vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" },
  { title: "Фестиваль огней",   meta: "Событие · 2023",      vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" },
  { title: "Марина и Кирилл",   meta: "Свадьба · 2023",      vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" },
  { title: "Северная история",  meta: "Свадьба · 2022",      vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" },
  { title: "Тёплый вечер",      meta: "Портрет · 2022",      vimeo: "76979871", hash: "", ratio: "horizontal", poster: "" }
];

(function () {
  "use strict";

  var PLACEHOLDERS = ["ph-1", "ph-2", "ph-3", "ph-4", "ph-5", "ph-6"];

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  /* Принимает id ("76979871") или ссылку ("https://vimeo.com/76979871"). */
  function vimeoId(value) {
    if (!value) return "";
    var raw = String(value).trim();
    var match = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (match) return match[1];
    return /^\d+$/.test(raw) ? raw : "";
  }

  function buildMedia(work, index) {
    var media;
    if (work.poster) {
      media = document.createElement("img");
      media.className = "work-card__media";
      media.src = work.poster;
      media.alt = "";
      media.width = 800;
      media.height = 1000;
      media.loading = "lazy";
      media.decoding = "async";
    } else {
      media = document.createElement("div");
      media.className = "work-card__media " + PLACEHOLDERS[index % PLACEHOLDERS.length];
    }
    return media;
  }

  /* Карточка: <article><button>…</button></article>.
     Кнопка, а не ссылка: плеер открывается в лайтбоксе, а не переходом. */
  function buildCard(work, index) {
    var id = vimeoId(work.vimeo);

    var card = document.createElement("article");
    card.className = "work-card";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "work-card__btn";

    var thumb = document.createElement("span");
    thumb.className = "work-card__thumb";
    thumb.appendChild(buildMedia(work, index));

    if (id) {
      btn.dataset.vimeo = id;
      if (work.hash) btn.dataset.hash = work.hash;
      btn.dataset.ratio = work.ratio === "vertical" ? "vertical" : "horizontal";
      btn.dataset.title = work.title;
      btn.setAttribute("aria-label", "Смотреть: " + work.title + " — " + work.meta);

      var play = document.createElement("span");
      play.className = "work-card__play";
      play.setAttribute("aria-hidden", "true");
      thumb.appendChild(play);
    } else {
      btn.disabled = true;
      btn.setAttribute("aria-label", work.title + " — видео скоро появится");
    }

    var idx = document.createElement("span");
    idx.className = "work-card__idx";
    idx.textContent = pad(index + 1);

    var title = document.createElement("span");
    title.className = "work-card__title";
    title.textContent = work.title;

    var meta = document.createElement("span");
    meta.className = "work-card__meta";
    meta.textContent = work.meta;

    btn.appendChild(thumb);
    btn.appendChild(idx);
    btn.appendChild(title);
    btn.appendChild(meta);
    card.appendChild(btn);
    return card;
  }

  function renderWorks() {
    var grid = document.getElementById("works-grid");
    if (!grid) return;

    var count = document.getElementById("works-count");
    if (count) count.textContent = pad(WORKS.length) + " фильмов";

    if (!WORKS.length) {
      var empty = document.createElement("p");
      empty.className = "works__empty";
      empty.textContent = "Работы скоро появятся.";
      grid.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    WORKS.forEach(function (work, i) { frag.appendChild(buildCard(work, i)); });
    grid.appendChild(frag);
  }

  /* Лайтбокс на нативном <dialog>: Esc, фокус-ловушка и возврат фокуса — из коробки. */
  function initLightbox() {
    var dialog = document.getElementById("lightbox");
    var frame = document.getElementById("lightbox-frame");
    if (!dialog || !frame || typeof dialog.showModal !== "function") return;

    var lastFocus = null;

    function clearFrame() {
      frame.replaceChildren(); // удаление iframe останавливает воспроизведение
    }

    function open(btn) {
      var params = new URLSearchParams({
        autoplay: "1",
        muted: "1",          // обязателен для автоплея в Chrome/Safari
        title: "0",
        byline: "0",
        portrait: "0",
        dnt: "1",
        playsinline: "1"
      });
      if (btn.dataset.hash) params.set("h", btn.dataset.hash);

      var iframe = document.createElement("iframe");
      iframe.src = "https://player.vimeo.com/video/" + btn.dataset.vimeo + "?" + params.toString();
      iframe.title = btn.dataset.title || "Видео";
      iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      iframe.setAttribute("allowfullscreen", "");
      clearFrame();
      frame.appendChild(iframe);

      dialog.dataset.ratio = btn.dataset.ratio || "horizontal";
      lastFocus = btn;
      dialog.showModal();
    }

    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || e.target.closest(".lightbox__close")) dialog.close();
    });

    dialog.addEventListener("close", function () {
      clearFrame();
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
    });

    var grid = document.getElementById("works-grid");
    if (!grid) return;
    grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".work-card__btn");
      if (btn && !btn.disabled) open(btn);
    });
  }

  function revealSections() {
    var items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  function setYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderWorks();
    initLightbox();
    revealSections();
    setYear();
  });
})();

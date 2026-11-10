/* =========================================================
   Ремонт38 — скрипты прототипа
   Калькулятор, чат-консультант, формы, мобильное меню.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Конфиг цен (меняется под клиента) ---------- */
  var RATES = {
    cosmetic: 5200,   // косметический, ₽/м²
    capital: 11800,   // капитальный, ₽/м²
    designer: 19500   // дизайнерский, ₽/м²
  };
  var HOUSING = { new: 1.0, secondary: 1.0, house: 1.08 };
  var OPTIONS = { demolition: 900, replan: 1600, design: 2400 };
  var ESTIMATE_KEY = "remont38_estimate";
  var ESTIMATE_TEXT = "";

  /* ---------- Контакты для заявок (заполните перед деплоем) ----------
     telegram: ник без @, например "remont38"
     whatsapp: номер в международном формате без +, например "79000000000"
     Если оба пустые — форма работает в демо-режиме. */
  var LEAD_CONTACT = {
    telegram: "",
    whatsapp: ""
  };

  function formatMoney(n) {
    return Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ") + " ₽";
  }

  /* ---------- Калькулятор ---------- */
  function initCalculator() {
    var root = document.querySelector("[data-calculator]");
    if (!root) return;

    var typeEl = root.querySelector("[data-calc-type]");
    var areaEl = root.querySelector("[data-calc-area]");
    var areaOut = root.querySelector("[data-calc-area-out]");
    var housingEl = root.querySelector("[data-calc-housing]");
    var demoEl = root.querySelector("[data-calc-demolition]");
    var replanEl = root.querySelector("[data-calc-replan]");
    var designEl = root.querySelector("[data-calc-design]");
    var sumEl = root.querySelector("[data-calc-sum]");
    var perM2El = root.querySelector("[data-calc-perm2]");
    var ctaEl = root.querySelector("[data-calc-cta]");

    function calc() {
      var area = Math.max(20, Math.min(300, Number(areaEl.value) || 54));
      var type = typeEl.value;
      var rate = (RATES[type] || RATES.capital) * (HOUSING[housingEl.value] || 1);
      var extra = 0;
      if (demoEl.checked) extra += OPTIONS.demolition;
      if (replanEl.checked) extra += OPTIONS.replan;
      if (designEl.checked) extra += OPTIONS.design;

      var base = area * (rate + extra);
      var min = Math.round((base * 0.92) / 1000) * 1000;
      var max = Math.round((base * 1.14) / 1000) * 1000;

      if (areaOut) areaOut.textContent = area + " м²";
      if (sumEl) sumEl.textContent = formatMoney(min) + " – " + formatMoney(max);
      if (perM2El) perM2El.textContent = "≈ " + formatMoney(Math.round((min + max) / 2 / area)) + " за м², работы без материалов";

      ESTIMATE_TEXT = "Предварительный расчёт: " + formatMoney(min) + " – " + formatMoney(max) +
        " (" + area + " м², " + typeEl.options[typeEl.selectedIndex].text.toLowerCase() + ").";
      try { sessionStorage.setItem(ESTIMATE_KEY, ESTIMATE_TEXT); } catch (e) {}
    }

    [typeEl, housingEl, demoEl, replanEl, designEl].forEach(function (el) {
      if (el) el.addEventListener("input", calc);
      if (el) el.addEventListener("change", calc);
    });
    if (areaEl) areaEl.addEventListener("input", calc);

    if (ctaEl) {
      ctaEl.addEventListener("click", function (e) {
        e.preventDefault();
        prefillLeadForm(ESTIMATE_TEXT);
        scrollToForm();
      });
    }

    calc();
  }

  function scrollToForm() {
    var form = document.getElementById("lead-form");
    if (!form) {
      location.href = "contacts.html#lead";
      return;
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    var first = form.querySelector("input[name='name']");
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 500);
  }

  function prefillLeadForm(text) {
    var msg = document.querySelector("#lead-form textarea[name='comment']");
    if (msg && text) msg.value = text;
  }

  /* ---------- Маска телефона ---------- */
  function initPhoneMask() {
    document.querySelectorAll("input[type='tel']").forEach(function (input) {
      input.addEventListener("input", function () {
        var digits = input.value.replace(/\D/g, "");
        if (digits[0] === "8") digits = "7" + digits.slice(1);
        if (digits[0] !== "7") digits = "7" + digits;
        digits = digits.slice(0, 11);
        var out = "+7";
        if (digits.length > 1) out += " (" + digits.slice(1, 4);
        if (digits.length >= 5) out += ") " + digits.slice(4, 7);
        if (digits.length >= 8) out += "-" + digits.slice(7, 9);
        if (digits.length >= 10) out += "-" + digits.slice(9, 11);
        input.value = out;
      });
    });
  }

  /* ---------- Формы ---------- */
  function initForms() {
    document.querySelectorAll("[data-lead-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = form.querySelector("input[name='name']");
        var phone = form.querySelector("input[name='phone']");
        var consent = form.querySelector("input[name='consent']");
        var error = form.querySelector("[data-form-error]");

        function fail(text) {
          if (error) {
            error.textContent = text;
            error.style.display = "block";
          }
        }

        if (!name || name.value.trim().length < 2) return fail("Напишите, как к вам обращаться.");
        if (!phone || phone.value.replace(/\D/g, "").length < 11) return fail("Проверьте номер телефона.");
        if (consent && !consent.checked) return fail("Нужно согласие на обработку данных.");
        if (error) error.style.display = "none";

        var comment = form.querySelector("textarea[name='comment']");
        var estimate = "";
        try { estimate = sessionStorage.getItem(ESTIMATE_KEY) || ""; } catch (err) {}
        if (comment && !comment.value && estimate) comment.value = estimate;

        // Демо-режим: здесь подключается CRM/Telegram-бот/почта.
        var data = {
          name: name.value.trim(),
          phone: phone.value.trim(),
          comment: comment ? comment.value.trim() : "",
          page: location.pathname,
          ts: new Date().toISOString()
        };
        console.log("[lead]", data);

        // Отправка в мессенджер (если указан контакт). Backend не нужен.
        var leadText = "Заявка с сайта Ремонт38: " + data.name + ", " + data.phone +
          (data.comment ? ". " + data.comment : "");
        if (LEAD_CONTACT.telegram) {
          window.open("https://t.me/" + LEAD_CONTACT.telegram.replace(/^@/, "") +
            "?text=" + encodeURIComponent(leadText), "_blank");
        } else if (LEAD_CONTACT.whatsapp) {
          window.open("https://wa.me/" + LEAD_CONTACT.whatsapp.replace(/\D/g, "") +
            "?text=" + encodeURIComponent(leadText), "_blank");
        }

        var success = form.querySelector(".form-success");
        if (success) {
          form.querySelectorAll(".field, .check, .btn, [data-form-error]").forEach(function (el) {
            el.style.display = "none";
          });
          success.classList.add("is-visible");
          success.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    document.querySelectorAll("[data-scroll-form]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        scrollToForm();
      });
    });
  }

  /* ---------- Мобильное меню ---------- */
  function initMenu() {
    var burger = document.querySelector("[data-burger]");
    var menu = document.querySelector("[data-mobile-nav]");
    if (!burger || !menu) return;
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Header shadow ---------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    function onScroll() {
      header.classList.toggle("is-scrolled", window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    var showAll = function () {
      items.forEach(function (el) { el.classList.add("is-in"); });
    };
    if (!("IntersectionObserver" in window)) {
      showAll();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
    // страховка: контент не должен остаться скрытым, если observer не сработал
    setTimeout(showAll, 1200);
  }

  /* ---------- Чат-консультант ---------- */
  var CHAT = {
    price: "Стоимость зависит от площади и типа ремонта. Ориентиры: косметический — от 5 200 ₽/м², капитальный — от 11 800 ₽/м², дизайнерский — от 19 500 ₽/м² (работы без материалов). Точный диапазон посчитает калькулятор на этой странице — это займёт 30 секунд.",
    term: "Срок зависит от площади и объёма: косметический — 3–6 недель, капитальный — 2–3 месяца, дизайнерский — 3–5 месяцев. Сроки фиксируем в договоре до начала работ.",
    warranty: "Даём гарантию 5 лет на работы — условия прописаны в договоре. Это больше, чем у большинства компаний в Иркутске (обычно 1–2 года).",
    measure: "Замер бесплатный, приезжаем в течение 24 часов по Иркутску. На замере фиксируем объём работ и готовим смету в течение 1–2 дней.",
    installments: "Есть поэтапная оплата: платите за каждый принятый этап. Также доступна рассрочка до 12 месяцев через банк-партнёр.",
    materials: "Можем закупить материалы по оптовым ценам — обычно это экономит 10–20% бюджета. Или работаем с вашими материалами.",
    contract: "Работаем только по договору: фиксируем смету, сроки, гарантию и порядок приёмки. Цена не меняется без вашего согласия.",
    design: "Дизайн-проект — от 2 500 ₽/м²: планировка, визуализация, рабочие чертежи и подбор материалов. Можно заказать отдельно или вместе с ремонтом.",
    contacts: "Мы в Иркутске, ул. Николая Гаврилова, 1а. Телефон +7 (3952) 00-00-00, ежедневно с 9:00 до 20:00. Можно оставить заявку — перезвоним за 15 минут.",
    hello: "Здравствуйте! Подскажу по ценам, срокам и гарантии. Что вас интересует?",
    fallback: "Чтобы ответить точно, уточните, пожалуйста: какой ремонт планируете и какая площадь? А лучше оставьте телефон — инженер перезвонит за 15 минут и посчитает смету."
  };

  var QUICK = [
    { label: "Сколько стоит?", key: "price" },
    { label: "Сроки", key: "term" },
    { label: "Гарантия", key: "warranty" },
    { label: "Замер", key: "measure" },
    { label: "Рассрочка", key: "installments" },
    { label: "Оставить заявку", key: "lead" }
  ];

  function matchIntent(text) {
    var t = text.toLowerCase();
    if (/(цена|стоим|сколько|бюджет|прайс|расч[её]т)/.test(t)) return "price";
    if (/(срок|когда|долго|быстро)/.test(t)) return "term";
    if (/(гарант|страхов|качеств)/.test(t)) return "warranty";
    if (/(замер|выезд|бесплатн)/.test(t)) return "measure";
    if (/(рассроч|кредит|оплат|этап)/.test(t)) return "installments";
    if (/(материал|закуп|плитк|обои)/.test(t)) return "materials";
    if (/(договор|смет|фиксир)/.test(t)) return "contract";
    if (/(дизайн|проект|визуализ)/.test(t)) return "design";
    if (/(адрес|контакт|телефон|где вы|офис)/.test(t)) return "contacts";
    if (/(привет|здравств|добрый)/.test(t)) return "hello";
    return "fallback";
  }

  function initChat() {
    var fab = document.querySelector("[data-chat-open]");
    var panel = document.querySelector("[data-chat-panel]");
    var close = document.querySelector("[data-chat-close]");
    var body = document.querySelector("[data-chat-body]");
    var form = document.querySelector("[data-chat-form]");
    var input = document.querySelector("[data-chat-input]");
    var quick = document.querySelector("[data-chat-quick]");
    if (!fab || !panel || !body) return;

    function addMsg(text, who) {
      var el = document.createElement("div");
      el.className = "msg msg--" + who;
      el.textContent = text;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function botReply(key) {
      if (key === "lead") {
        addMsg("Отлично! Оставьте заявку в форме на странице — или напишите телефон здесь, и мы перезвоним в течение 15 минут.", "bot");
        return;
      }
      var typing = addMsg("Печатает…", "bot");
      typing.classList.add("msg--typing");
      setTimeout(function () {
        typing.classList.remove("msg--typing");
        typing.textContent = CHAT[key] || CHAT.fallback;
        body.scrollTop = body.scrollHeight;
      }, 550);
    }

    if (quick) {
      QUICK.forEach(function (q) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = q.label;
        b.addEventListener("click", function () {
          addMsg(q.label, "user");
          botReply(q.key);
        });
        quick.appendChild(b);
      });
    }

    fab.addEventListener("click", function () {
      var open = panel.classList.toggle("is-open");
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        if (!body.dataset.greeted) {
          body.dataset.greeted = "1";
          setTimeout(function () { addMsg(CHAT.hello, "bot"); }, 250);
        }
        if (input) input.focus();
      }
    });

    if (close) close.addEventListener("click", function () {
      panel.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
    });

    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (input.value || "").trim();
      if (!text) return;
      addMsg(text, "user");
      input.value = "";
      botReply(matchIntent(text));
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initCalculator();
    initPhoneMask();
    initForms();
    initMenu();
    initHeader();
    initReveal();
    initChat();
  });
})();

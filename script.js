/* =========================================================
   ゆるトレ婚活  script.js
   ========================================================= */

/* ---- 予約メールの宛先（変更はここだけ） ---- */
const MAIL_TO = "cereo2027@gmail.com";

/* ---- LINE公式アカウントのURL（空のままなら、LINEボタンは表示されません） ---- */
/* 例： const LINE_URL = "https://lin.ee/xxxxxxx"; */
const LINE_URL = "";

(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* ---- LINEボタン ---- */
  const lineBtn = document.getElementById("lineBtn");
  if (lineBtn && LINE_URL) {
    lineBtn.href = LINE_URL;
    lineBtn.hidden = false;
  }

  /* ---- ヘッダーに線を出す ---- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- ふわっと表示 ---- */
  const items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }

  /* ---- 「このコースで予約」でフォームのコースを選ぶ ---- */
  const courseSelect = document.getElementById("course");
  document.querySelectorAll("[data-course]").forEach((a) => {
    a.addEventListener("click", () => {
      const v = a.getAttribute("data-course");
      for (const o of courseSelect.options) {
        if (o.text === v) { courseSelect.value = o.value; break; }
      }
    });
  });

  /* ---- 予約フォーム ---- */
  const form = document.getElementById("reserveForm");
  const errBox = document.getElementById("formError");
  const result = document.getElementById("formResult");
  const btn = document.getElementById("submitBtn");

  const val = (id) => document.getElementById(id).value.trim();

  function validate() {
    if (!val("name")) return ["お名前を入力してください。", "name"];
    const age = parseInt(val("age"), 10);
    if (!age || age < 18 || age > 99) return ["年齢を半角数字で入力してください。", "age"];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email")))
      return ["メールアドレスの形式を確認してください。", "email"];
    return null;
  }

  function buildText() {
    return [
      "【ゆるトレ婚活 予約】",
      "希望コース：" + courseSelect.value,
      "お名前：" + val("name"),
      "年齢：" + val("age"),
      "メール：" + val("email"),
      "電話：" + (val("tel") || "（未入力）"),
      "希望時期：" + (val("when") || "（未入力）"),
      "ご質問・ご要望：",
      val("msg") || "（なし）",
    ].join("\n");
  }

  /* 送信に失敗したとき、お客様のメールアプリで送れるようにする */
  function showFallback(text) {
    const subject = "【ゆるトレ婚活】予約：" + val("name") + "様";
    const href =
      "mailto:" + MAIL_TO +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(text);
    result.className = "form-result";
    result.innerHTML =
      "<b>自動送信できませんでした</b>" +
      "下のボタンからメールで送ってください。開かない場合は、内容をコピーして <strong>" + MAIL_TO + "</strong> に送ってください。" +
      "<pre></pre>" +
      '<div class="row"><a class="btn" href="' + href + '">メールアプリで開く</a>' +
      '<button type="button" class="btn btn-line" id="copyBtn">内容をコピー</button></div>';
    result.querySelector("pre").textContent = text;
    result.hidden = false;
    const copy = document.getElementById("copyBtn");
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        copy.textContent = "コピーしました";
      } catch (e) {
        const r = document.createRange();
        r.selectNodeContents(result.querySelector("pre"));
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        copy.textContent = "選択しました。コピーしてください";
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.textContent = "";
    result.hidden = true;

    const bad = validate();
    if (bad) {
      errBox.textContent = bad[0];
      document.getElementById(bad[1]).focus();
      return;
    }
    /* スパム用の見えない欄に入力があれば送らない */
    if (document.getElementById("honey").value) return;

    btn.disabled = true;
    btn.textContent = "送信中…";

    const payload = {
      希望コース: courseSelect.value,
      お名前: val("name"),
      年齢: val("age"),
      メール: val("email"),
      電話: val("tel") || "（未入力）",
      希望時期: val("when") || "（未入力）",
      "ご質問・ご要望": val("msg") || "（なし）",
      _subject: "【ゆるトレ婚活】予約：" + val("name") + "様",
      _replyto: val("email"),
      _template: "table",
      _captcha: "false",
    };

    try {
      /* FormSubmit（無料のフォーム受信サービス）で MAIL_TO にメールを届けます */
      const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(MAIL_TO), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === "false" || data.success === false) throw new Error("send failed");

      result.className = "form-result ok";
      result.innerHTML =
        "<b>予約を受け付けました</b>" +
        "内容を確認して、日程と場所を主催者からご連絡します。しばらくお待ちください。";
      result.hidden = false;
      form.reset();
    } catch (err) {
      showFallback(buildText());
    } finally {
      btn.disabled = false;
      btn.textContent = "予約を送信する";
      result.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
})();

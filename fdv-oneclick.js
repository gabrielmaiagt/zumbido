(function () {
  var COOKIE = "fdv_pay";
  var API = "/.netlify/functions/oneclick";

  var FALLBACK = {
    up1: { ch: "ch_mpPpHuBsVCvJEu0", next: "/up2-sono/" },
    down1: { ch: "ch_ZV218HJSm1d8cZr", next: "/up2-sono/" },
    up2: { ch: "ch_XCNVzI25032PdyB", next: "/up3-express/" },
    down2: { ch: "ch_RhDK3jGPvCpFku9", next: "/up3-express/" },
    up3: { ch: "ch_5IqdWTBBD4sV9fy", next: "/up4-pack/" },
    down3: { ch: "ch_5wBWm8zuP0aGORK", next: "/up4-pack/" },
    up4: { ch: "ch_wkqBOptyOQqgpIm", next: "/up5-masterclass/" },
    down4: { ch: "ch_ZuleQLvoFp18jeX", next: "/up5-masterclass/" },
    up5: { ch: "ch_mkhgymyihFGxu19", next: "/up6-comunidade/" },
    down5: { ch: "ch_kGjvQrToSsr5XGL", next: "/up6-comunidade/" },
    up6: { ch: "ch_nLqiD5OS98mmoVi", next: "/up7-postural/" },
    down6: { ch: "ch_WO7xbl0EEOg7jc4", next: "/up7-postural/" },
    up7: { ch: "ch_ZK1eTJ1YO9qalbp", next: "/up8-ambiente/" },
    down7: { ch: "ch_rzyg0Hma0021T9I", next: "/up8-ambiente/" },
    up8: { ch: "ch_bAPbyGlwN2jXfQa", next: "/up9-familia/" },
    down8: { ch: "ch_GvN7XUTdcEIpbiu", next: "/up9-familia/" },
    up9: { ch: "ch_1UqgdPkn28zmDgp", next: "/up10-matinal/" },
    down9: { ch: "ch_2uqWYt6e7YBUu8g", next: "/up10-matinal/" },
    up10: { ch: "ch_0zcg55ORdVTqy74", next: "/up11-antiestresse/" },
    down10: { ch: "ch_9xoMWu2T3uSuVqu", next: "/up11-antiestresse/" },
    up11: { ch: "ch_j4jhe409lGp7jlY", next: "/up12-vagal/" },
    down11: { ch: "ch_Z0fCCsynVRBHxop", next: "/up12-vagal/" },
    up12: { ch: "ch_ECf0v0JqWoYxqCS", next: "/acesso/" },
    down12: { ch: "ch_M2wxA0hCkASHXZk", next: "/acesso/" }
  };

  function setCookie(id) {
    document.cookie = COOKIE + "=" + encodeURIComponent(id) + "; Path=/; Max-Age=86400; SameSite=Lax; Secure";
  }
  function getCookie() {
    var m = document.cookie.match(/(?:^|; )fdv_pay=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function qsPay() {
    var p = new URLSearchParams(location.search);
    return p.get("pay") || p.get("fdv_pay") || p.get("payment_id") || "";
  }
  function getPay() {
    var id = qsPay() || getCookie();
    if (id && /^pay_/.test(id)) setCookie(id);
    return id;
  }
  function withPay(path, pay) {
    var u = new URL(path, location.origin);
    new URLSearchParams(location.search).forEach(function (v, k) {
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    });
    if (pay) u.searchParams.set("pay", pay);
    return u.pathname + u.search + u.hash;
  }
  function hosted(ch) {
    var u = new URL("https://whop.com/checkout/" + ch);
    new URLSearchParams(location.search).forEach(function (v, k) {
      if (k === "pay" || k === "fdv_pay" || k === "payment_id" || k === "status") return;
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    });
    return u.toString();
  }
  function goNext(next, pay) {
    location.href = withPay(next, pay);
  }
  function goHosted(offerKey) {
    var o = FALLBACK[offerKey];
    if (!o) return;
    location.href = hosted(o.ch);
  }

  window.fdvSavePay = function (paymentId) {
    if (paymentId && /^pay_/.test(paymentId)) setCookie(paymentId);
  };
  window.fdvFrontComplete = function (planId, receiptId) {
    if (receiptId) setCookie(receiptId);
    location.href = withPay("/up1-acompanhamento/", receiptId);
  };

  getPay();

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-fdv-buy]");
    if (!el) return;
    e.preventDefault();
    var offer = el.getAttribute("data-fdv-buy");
    if (!FALLBACK[offer] || el.getAttribute("data-fdv-busy") === "1") return;
    el.setAttribute("data-fdv-busy", "1");
    var old = el.innerText;
    el.innerText = "Processando...";

    var pay = getPay();
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer: offer, pay: pay, qs: location.search })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.next) {
          goNext(data.next, pay);
          return;
        }
        if (data && data.checkout_url) {
          location.href = data.checkout_url;
          return;
        }
        goHosted(offer);
      })
      .catch(function () { goHosted(offer); })
      .finally(function () {
        el.setAttribute("data-fdv-busy", "0");
        el.innerText = old;
      });
  });
})();

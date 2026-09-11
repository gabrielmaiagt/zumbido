const ACCOUNT_ID = "biz_j9p9dmKw7rkUZK";
const API = "https://api.whop.com/api/v1";

const OFFERS = {
  up1: { plan: "plan_yibSH8j1OxqSm", ch: "ch_mpPpHuBsVCvJEu0", next: "/up2-sono/" },
  down1: { plan: "plan_8uMdbtbFEQpjG", ch: "ch_ZV218HJSm1d8cZr", next: "/up2-sono/" },
  up2: { plan: "plan_1xMrX5f6zidfP", ch: "ch_XCNVzI25032PdyB", next: "/up3-express/" },
  down2: { plan: "plan_GBq97KvK2iOV1", ch: "ch_RhDK3jGPvCpFku9", next: "/up3-express/" },
  up3: { plan: "plan_ODj7wB2PrVe4S", ch: "ch_5IqdWTBBD4sV9fy", next: "/up4-pack/" },
  down3: { plan: "plan_VBfus1S3yNSyW", ch: "ch_5wBWm8zuP0aGORK", next: "/up4-pack/" },
  up4: { plan: "plan_ERXPgX54O2nGz", ch: "ch_wkqBOptyOQqgpIm", next: "/up5-masterclass/" },
  down4: { plan: "plan_M4yZBkfJyA1JM", ch: "ch_ZuleQLvoFp18jeX", next: "/up5-masterclass/" },
  up5: { plan: "plan_rVVNCfshM4gEP", ch: "ch_mkhgymyihFGxu19", next: "/up6-comunidade/" },
  down5: { plan: "plan_XxprmI6QjVPYJ", ch: "ch_kGjvQrToSsr5XGL", next: "/up6-comunidade/" },
  up6: { plan: "plan_rpGOHkR74qtiS", ch: "ch_nLqiD5OS98mmoVi", next: "/up7-postural/" },
  down6: { plan: "plan_MaRr4mXCKmQVk", ch: "ch_WO7xbl0EEOg7jc4", next: "/up7-postural/" },
  up7: { plan: "plan_K6Pc837MhAhdA", ch: "ch_ZK1eTJ1YO9qalbp", next: "/up8-ambiente/" },
  down7: { plan: "plan_mVmtqaMYZyw3m", ch: "ch_rzyg0Hma0021T9I", next: "/up8-ambiente/" },
  up8: { plan: "plan_JijHb8dtbxJtp", ch: "ch_bAPbyGlwN2jXfQa", next: "/up9-familia/" },
  down8: { plan: "plan_W13qQzACISnid", ch: "ch_GvN7XUTdcEIpbiu", next: "/up9-familia/" },
  up9: { plan: "plan_YLCFCag855N0T", ch: "ch_1UqgdPkn28zmDgp", next: "/up10-matinal/" },
  down9: { plan: "plan_2OKb4d9q4a0lB", ch: "ch_2uqWYt6e7YBUu8g", next: "/up10-matinal/" },
  up10: { plan: "plan_J8vUQSU67kIr4", ch: "ch_0zcg55ORdVTqy74", next: "/up11-antiestresse/" },
  down10: { plan: "plan_9SdpoFlmf0h65", ch: "ch_9xoMWu2T3uSuVqu", next: "/up11-antiestresse/" },
  up11: { plan: "plan_Yu1X5OZFMKdTV", ch: "ch_j4jhe409lGp7jlY", next: "/up12-vagal/" },
  down11: { plan: "plan_yEnO9WefKlQM9", ch: "ch_Z0fCCsynVRBHxop", next: "/up12-vagal/" },
  up12: { plan: "plan_xvRZEN6HPv4GT", ch: "ch_ECf0v0JqWoYxqCS", next: "/acesso/" },
  down12: { plan: "plan_ZgMJjsVVeIkTU", ch: "ch_M2wxA0hCkASHXZk", next: "/acesso/" },
};

const CHARGEABLE = new Set(["card", "link", "apple_pay", "google_pay"]);

const cors = {
  "Access-Control-Allow-Origin": "https://segredodozumbido.netlify.app",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json", ...cors }, body: JSON.stringify(body) };
}

function checkoutUrl(ch, qs) {
  const u = new URL("https://whop.com/checkout/" + ch);
  if (qs) {
    const src = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
    for (const [k, v] of src) {
      if (k === "pay" || k === "fdv_pay" || k === "payment_id") continue;
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    }
  }
  return u.toString();
}

async function whop(method, path, key, body, extraHeaders) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error((data && data.error && data.error.message) || text || ("HTTP " + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitPaid(id, key) {
  for (let i = 0; i < 10; i++) {
    const st = await whop("GET", "/payments/" + id + "/status", key);
    if (st.status === "succeeded" || st.status === "requires_capture") return { ok: true };
    if (st.status === "canceled") {
      return { ok: false, reason: (st.last_payment_error && st.last_payment_error.message) || "canceled" };
    }
    if (st.status === "requires_action") return { ok: false, reason: "requires_action" };
    await sleep(600);
  }
  return { ok: false, reason: "timeout" };
}

function pickMethod(payment, methods) {
  const t = payment && payment.payment_method_type;
  if (payment && payment.payment_method_id && CHARGEABLE.has(t)) {
    return { id: payment.payment_method_id, type: t };
  }
  const list = (methods && methods.data) || [];
  const found = list.find((m) => CHARGEABLE.has(m.payment_method_type) && !m.broken && !m.expired);
  if (!found) return null;
  return { id: found.id, type: found.payment_method_type, last4: found.card && found.card.last4, brand: found.card && found.card.brand };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  const key = process.env.WHOP_API_KEY;
  if (!key) return json(500, { ok: false, error: "missing_key" });

  try {
    if (event.httpMethod === "GET") {
      const pay = (event.queryStringParameters && event.queryStringParameters.pay) || "";
      if (!/^pay_[A-Za-z0-9]+$/.test(pay)) return json(400, { ok: false, oneclick: false });
      const payment = await whop("GET", "/payments/" + pay, key);
      if (payment.account_id && payment.account_id !== ACCOUNT_ID) return json(403, { ok: false, oneclick: false });
      if (!payment.member_id) return json(200, { ok: true, oneclick: false });
      const methods = await whop("GET", "/payment_methods?member_id=" + encodeURIComponent(payment.member_id), key);
      const method = pickMethod(payment, methods);
      return json(200, {
        ok: true,
        oneclick: Boolean(method),
        last4: method && method.last4 ? method.last4 : null,
        brand: method && method.brand ? method.brand : null,
      });
    }

    if (event.httpMethod !== "POST") return json(405, { ok: false });

    const body = JSON.parse(event.body || "{}");
    const offer = OFFERS[body.offer];
    const pay = String(body.pay || "");
    if (!offer) return json(400, { ok: false, error: "unknown_offer" });
    if (!/^pay_[A-Za-z0-9]+$/.test(pay)) {
      return json(200, { ok: false, fallback: true, checkout_url: checkoutUrl(offer.ch, body.qs), next: offer.next });
    }

    const payment = await whop("GET", "/payments/" + pay, key);
    if (payment.account_id && payment.account_id !== ACCOUNT_ID) return json(403, { ok: false, error: "wrong_account" });
    if (!payment.member_id) {
      return json(200, { ok: false, fallback: true, checkout_url: checkoutUrl(offer.ch, body.qs), next: offer.next });
    }

    const methods = await whop("GET", "/payment_methods?member_id=" + encodeURIComponent(payment.member_id), key);
    const method = pickMethod(payment, methods);
    if (!method) {
      return json(200, { ok: false, fallback: true, checkout_url: checkoutUrl(offer.ch, body.qs), next: offer.next });
    }

    const created = await whop(
      "POST",
      "/payments",
      key,
      {
        account_id: ACCOUNT_ID,
        plan_id: offer.plan,
        member_id: payment.member_id,
        payment_method_id: method.id,
        metadata: { fdv_offer: String(body.offer), fdv_from: pay },
      },
      { "Idempotency-Key": "fdv-" + payment.member_id + "-" + offer.plan }
    );

    const result = await waitPaid(created.id, key);
    if (!result.ok) {
      return json(200, {
        ok: false,
        fallback: true,
        reason: result.reason,
        checkout_url: checkoutUrl(offer.ch, body.qs),
        next: offer.next,
      });
    }

    return json(200, { ok: true, payment_id: created.id, next: offer.next });
  } catch (e) {
    return json(200, { ok: false, fallback: true, error: e.message || "error" });
  }
};

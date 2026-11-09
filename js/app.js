// =============================================================
//  app.js — 한 끼 가이드 화면 동작
//  페이지(주소 #): home · guide · place-<id> · add · criteria · about · me
//  데이터는 store.js의 Store를 통해서만 읽고 씁니다.
// =============================================================

const CRITERIA = [
  { k: "taste",   label: "맛",        help: "다시 먹고 싶은가" },
  { k: "value",   label: "가성비",    help: "학생 지갑으로 낸 돈만큼 만족스러운가" },
  { k: "portion", label: "양",        help: "한 끼로 배가 차는가" },
  { k: "solo",    label: "혼밥 편의", help: "혼자 가도 편한가 (1인석·1인 메뉴)" },
  { k: "access",  label: "접근성",    help: "학교·대중교통에서 가기 쉬운가" },
];

// 소개 페이지 — 실제 이름·역할로 바꾸세요
const TEAM = [
  { name: "[조원 A]", role: "기획 · 메인 화면 디자인" },
  { name: "[조원 B]", role: "맛집 찾기 화면 · 필터" },
  { name: "[조원 C]", role: "식당 상세 · 채점 기능" },
  { name: "[조원 D]", role: "로그인 · 데이터베이스 · 배포" },
];

const state = {
  page: "home", placeId: null,
  region: "", city: "", cat: "", query: "", filter: "all", sort: "score",
  restaurants: [], ratings: [], loaded: { r: false, s: false },
  user: null, profile: null, isAdmin: false,
  pendingEmailAsk: null, confirmDelete: null,
};

// ---------- 유틸 ----------
const $ = (s) => document.querySelector(s);
const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
const priceText = (r) => r.priceLabel || won(r.price);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const fmt = (n) => (n == null ? "–" : n.toFixed(1));
const catName = (id) => CATEGORIES.find((c) => c.id === id)?.name || "기타";
const byId = (id) => state.restaurants.find((r) => r.id === id);
const mapLink = (r) => "https://map.kakao.com/link/search/" + encodeURIComponent(`${r.city || ""} ${r.name}`.trim());
const dateText = (t) => (t ? new Date(t).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" }) : "");
const regionLabel = () => state.region || "전국";
const loggedReady = () => state.user && state.profile?.nickname && state.profile?.school;

// ---------- 점수 계산 ----------
function ratingsFor(rid) { return state.ratings.filter((x) => x.restaurantId === rid).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); }
function rowAvg(x) { return avg(CRITERIA.map((c) => x[c.k])); }
function summary(r) {
  const rs = ratingsFor(r.id);
  const crit = {};
  CRITERIA.forEach((c) => (crit[c.k] = avg(rs.map((x) => x[c.k]))));
  const overall = rs.length ? avg(CRITERIA.map((c) => crit[c.k])) : null;
  const enough = rs.length >= SITE.minRaters;
  const stars = !enough ? 0 : overall >= 4.5 ? 3 : overall >= 4.0 ? 2 : overall >= 3.5 ? 1 : 0;
  const hanki = enough && crit.value >= 4.0 && Number(r.price) <= SITE.hankiPrice;
  return { rs, crit, overall, enough, stars, hanki, count: rs.length };
}

// ---------- 공통 조각 ----------
function starHTML(s) {
  if (!s.count) return `<span class="pending">채점 없음</span>`;
  if (!s.enough) return `<span class="pending">채점 ${s.count}/${SITE.minRaters}</span><span class="score">${fmt(s.overall)}</span>`;
  if (!s.stars) return `<span class="no-star">별 없음</span><span class="score">${fmt(s.overall)}</span>`;
  return `<span class="stars s${s.stars}" aria-label="별 ${s.stars}개">${"★".repeat(s.stars)}</span><span class="score">${fmt(s.overall)}</span>`;
}
function cardHTML(r, s) {
  return `
    <a class="card" href="#place-${esc(r.id)}" aria-label="${esc(r.name)} 자세히 보기">
      <div class="card-top"><div class="rating">${starHTML(s)}</div>${s.hanki ? `<span class="badge-hanki">한 끼 추천</span>` : ""}</div>
      <h3>${esc(r.name)}</h3>
      <p class="meta">${esc(r.region)} ${esc(r.city)}${r.area ? " · " + esc(r.area) : ""} · ${catName(r.category)}</p>
      <p class="menu"><span>${esc(r.menu)}</span><b class="num">${esc(priceText(r))}</b></p>
      <p class="students">채점 ${s.count}명</p>
    </a>`;
}
function ratingItemHTML(x, withPlace) {
  const r = withPlace ? byId(x.restaurantId) : null;
  const mine = state.user && x.uid === state.user.uid;
  return `<li class="review">
    <span class="r-score">★ ${fmt(rowAvg(x))}</span>
    <div class="r-body">${r ? `<a class="r-place" href="#place-${esc(r.id)}">${esc(r.name)}</a>` : ""}<p>${esc(x.text || "(한 줄 평 없음)")}</p></div>
    <span class="r-who">${esc(x.nickname || "학생")}${mine ? " (나)" : ""}<br>${esc(x.school || "")} · ${dateText(x.updatedAt)}</span></li>`;
}
function regionOptions(sel, withAll) {
  return (withAll ? `<option value="">전국</option>` : "") +
    REGIONS.map((r) => `<option value="${r}"${r === sel ? " selected" : ""}>${r}</option>`).join("");
}

// ---------- 홈 ----------
function renderHome() {
  $("#home-region").innerHTML = regionOptions(state.region, true);
  const sums = state.restaurants.map((r) => ({ r, s: summary(r) }));
  const starred = sums.filter((x) => x.s.stars > 0).sort((a, b) => b.s.overall - a.s.overall);
  const raters = new Set(state.ratings.map((x) => x.uid)).size;
  $("#home-stats").innerHTML = `
    <div class="stat"><b class="num">${state.restaurants.length}</b><span>${regionLabel()} 등록 식당</span></div>
    <div class="stat"><b class="num">${state.ratings.length}</b><span>채점 수</span></div>
    <div class="stat"><b class="num">${raters}</b><span>참여한 학생</span></div>
    <div class="stat"><b class="num">${starred.length}</b><span>별 받은 식당</span></div>`;
  $("#home-starred-title").textContent = `${regionLabel()} 별 받은 식당`;
  $("#home-starred").innerHTML = starred.length
    ? `<ol class="rank">${starred.slice(0, 6).map(({ r, s }) => `
        <li><a href="#place-${esc(r.id)}"><span class="stars s${s.stars}">${"★".repeat(s.stars)}</span><b>${esc(r.name)}</b>
        <span class="rank-meta">${esc(r.city)} · ${catName(r.category)} · ${fmt(s.overall)}점 · ${s.count}명</span></a></li>`).join("")}</ol>`
    : `<div class="empty-box"><b>아직 별 받은 식당이 없어요</b><p>한 식당에 ${SITE.minRaters}명 이상 채점하면 별이 붙어요. <a href="#guide">맛집 찾기</a>에서 다녀온 식당을 채점해 주세요.</p></div>`;
  const recent = [...state.ratings].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5);
  $("#home-recent").innerHTML = recent.length
    ? `<ul class="reviews">${recent.map((x) => ratingItemHTML(x, true)).join("")}</ul>`
    : `<div class="empty-box"><b>첫 채점을 기다려요</b><p>학교 이메일로 로그인하면 바로 채점할 수 있어요.</p></div>`;
}

// ---------- 맛집 찾기 ----------
function renderGuide() {
  $("#min-raters").textContent = SITE.minRaters;
  $("#g-region").innerHTML = regionOptions(state.region, true);
  const cities = [...new Set(state.restaurants.map((r) => r.city).filter(Boolean))].sort();
  if (state.city && !cities.includes(state.city)) state.city = "";
  $("#g-city").innerHTML = `<option value="">전체</option>` + cities.map((c) => `<option${c === state.city ? " selected" : ""}>${esc(c)}</option>`).join("");
  $("#g-city").disabled = !state.region;
  $("#g-cat").innerHTML = `<option value="">전체</option>` + CATEGORIES.map((c) => `<option value="${c.id}"${c.id === state.cat ? " selected" : ""}>${c.name}</option>`).join("");

  const q = state.query.trim().toLowerCase();
  const list = state.restaurants.map((r) => ({ r, s: summary(r) })).filter(({ r, s }) =>
    (!state.city || r.city === state.city) && (!state.cat || r.category === state.cat) &&
    (q === "" || [r.name, r.menu, r.area, r.address, r.city, ...s.rs.map((x) => x.school)].join(" ").toLowerCase().includes(q)) &&
    (state.filter === "all" || (state.filter === "starred" && s.stars > 0) ||
      (state.filter === "hanki" && s.hanki) || (state.filter === "few" && !s.enough)));
  const by = {
    score: (a, b) => (b.s.enough - a.s.enough) || ((b.s.overall ?? -1) - (a.s.overall ?? -1)),
    count: (a, b) => b.s.count - a.s.count,
    new: (a, b) => (b.r.createdAt || 0) - (a.r.createdAt || 0),
    "price-asc": (a, b) => a.r.price - b.r.price,
  }[state.sort];
  list.sort(by);
  $("#result-count").textContent = `${list.length}곳`;
  $("#cards").innerHTML = !state.loaded.r ? `<p class="empty">불러오는 중…</p>`
    : list.length ? list.map(({ r, s }) => cardHTML(r, s)).join("")
    : `<div class="empty-box"><b>${regionLabel()}에 조건에 맞는 식당이 없어요</b><p>검색 조건을 바꾸거나, 아는 식당을 <a href="#add">직접 등록</a>해 주세요.</p></div>`;
}

// ---------- 식당 상세 ----------
const scoreSelect = (id, v) => `<select id="${id}">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}"${v === n ? " selected" : ""}>${n}</option>`).join("")}</select>`;
function bar(c, v) {
  return `<div class="bar-row"><span class="bar-label" title="${esc(c.help)}">${c.label}</span>
    <span class="bar"><span style="width:${v == null ? 0 : (v / 5) * 100}%"></span></span><span class="bar-val num">${fmt(v)}</span></div>`;
}
function renderPlace() {
  const el = $("#page-place");
  const r = byId(state.placeId);
  if (!r) {
    el.innerHTML = state.loaded.r
      ? `<div class="page-head"><h1>식당을 찾을 수 없어요</h1><p>삭제되었거나 다른 지역에 있을 수 있어요. <a href="#guide">맛집 찾기로 돌아가기</a></p></div>`
      : `<p class="empty">불러오는 중…</p>`;
    return;
  }
  const s = summary(r);
  const mine = state.user ? s.rs.find((x) => x.uid === state.user.uid) : null;
  const canManage = state.user && (state.isAdmin || r.createdBy === state.user.uid);

  let rateBox;
  if (!state.user) rateBox = `<div class="empty-box"><b>채점하려면 로그인하세요</b><p><a href="#me">학교 이메일로 로그인</a>하면 이 식당을 채점할 수 있어요.</p></div>`;
  else if (!loggedReady()) rateBox = `<div class="empty-box"><b>닉네임과 학교를 먼저 정해 주세요</b><p><a href="#me">내 정보</a>에서 한 번만 입력하면 돼요.</p></div>`;
  else rateBox = `
    <form class="form" id="rate-form">
      <p class="form-title">${mine ? "내 채점 고치기" : "내 채점"}</p>
      <div class="score-grid">${CRITERIA.map((c) => `<label for="s-${c.k}" title="${esc(c.help)}">${c.label}${scoreSelect("s-" + c.k, mine?.[c.k] ?? 3)}</label>`).join("")}</div>
      <label for="s-text">한 줄 평 (선택)<input id="s-text" maxlength="120" placeholder="예: 시험 끝나고 가기 딱 좋은 양" value="${esc(mine?.text || "")}"></label>
      <div class="form-foot"><button class="btn" type="submit">${mine ? "채점 고치기" : "채점 저장"}</button>
        ${mine ? `<button class="btn-ghost" type="button" id="rate-del">내 채점 지우기</button>` : ""}
        <span class="form-msg" id="rate-msg" aria-live="polite"></span></div>
    </form>`;

  el.innerHTML = `
    <p class="crumb"><a href="#guide">맛집 찾기</a> › ${esc(r.region)} ${esc(r.city)}</p>
    <div class="place-layout">
      <div class="place-main">
        <div class="place-head">
          <p class="eyebrow">${catName(r.category)} · ${esc(r.region)} ${esc(r.city)}${r.area ? " · " + esc(r.area) : ""}</p>
          <h1>${esc(r.name)}</h1>
          <div class="m-rating">${starHTML(s)} ${s.hanki ? `<span class="badge-hanki">한 끼 추천</span>` : ""}</div>
          ${r.desc ? `<p class="m-desc">${esc(r.desc)}</p>` : ""}
        </div>
        <section class="m-sec">
          <h2>학생 채점 <small>${s.count ? `${s.count}명 평균${s.enough ? "" : ` · 별까지 ${SITE.minRaters - s.count}명 더`}` : "아직 채점 전"}</small></h2>
          <div class="bars">${CRITERIA.map((c) => bar(c, s.crit[c.k])).join("")}</div>
          ${rateBox}
        </section>
        <section class="m-sec">
          <h2>한 줄 평 <small>${s.rs.filter((x) => x.text).length}개</small></h2>
          ${s.rs.length ? `<ul class="reviews">${s.rs.map((x) => ratingItemHTML(x, false)
            + (state.isAdmin && x.uid !== state.user?.uid ? `<li class="admin-row"><button class="link-btn" data-del-rating="${esc(x.uid)}">운영진: 이 채점 지우기</button></li>` : "")).join("")}</ul>`
            : `<p class="hint">첫 채점을 남겨 주세요.</p>`}
        </section>
      </div>
      <aside class="place-side">
        <div class="info-card">
          <h2>가게 정보</h2>
          <dl class="facts">
            <div><dt>대표 메뉴</dt><dd>${esc(r.menu)}</dd></div>
            <div><dt>가격</dt><dd class="num">${esc(priceText(r))}</dd></div>
            <div><dt>주소</dt><dd>${esc(r.address || "입력 안 됨")}</dd></div>
            <div><dt>영업시간</dt><dd class="num">${esc(r.hours || "방문 전 확인")}</dd></div>
            <div><dt>휴무</dt><dd>${esc(r.closed || "방문 전 확인")}</dd></div>
          </dl>
          <a class="btn btn-block" href="${mapLink(r)}" target="_blank" rel="noopener">카카오맵에서 보기</a>
          <p class="source">학생이 입력한 정보예요. 바뀌었을 수 있어요.${r.sourceUrl ? ` <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">정보 출처</a>` : ""}</p>
        </div>
        ${canManage ? `<div class="info-card">
          <h2>${state.isAdmin ? "운영진 메뉴" : "내가 등록한 식당"}</h2>
          ${state.confirmDelete === r.id
            ? `<p class="hint">식당과 모든 채점이 사라져요. 정말 지울까요?</p><div class="form-foot"><button class="btn danger" id="del-yes">지우기</button><button class="btn-ghost" id="del-no">취소</button></div>`
            : `<button class="btn-ghost" id="del-place">식당 삭제</button>`}
        </div>` : ""}
      </aside>
    </div>`;

  $("#rate-form")?.addEventListener("submit", (e) => saveRating(e, r));
  $("#rate-del")?.addEventListener("click", async () => { await Store.deleteRating(r.id, state.user.uid); });
  $("#del-place")?.addEventListener("click", () => { state.confirmDelete = r.id; renderPlace(); });
  $("#del-no")?.addEventListener("click", () => { state.confirmDelete = null; renderPlace(); });
  $("#del-yes")?.addEventListener("click", async () => {
    try { await Store.deleteRestaurant(r.id); state.confirmDelete = null; location.hash = "#guide"; }
    catch { alertInline("삭제하지 못했어요. 권한을 확인해 주세요."); }
  });
  el.querySelectorAll("[data-del-rating]").forEach((b) => b.addEventListener("click", () => Store.deleteRating(r.id, b.dataset.delRating)));
}
function alertInline(t) { const m = $("#rate-msg") || $("#add-msg"); if (m) m.textContent = t; }

async function saveRating(e, r) {
  e.preventDefault();
  const msg = $("#rate-msg");
  const entry = {
    restaurantId: r.id, region: r.region, uid: state.user.uid,
    nickname: state.profile.nickname, school: state.profile.school,
    text: $("#s-text").value.trim().slice(0, 120),
  };
  CRITERIA.forEach((c) => (entry[c.k] = Number($("#s-" + c.k).value)));
  msg.textContent = "저장 중…";
  try { await Store.saveRating(entry); document.activeElement?.blur(); renderPlace(); $("#rate-msg") && ($("#rate-msg").textContent = "저장했어요"); }
  catch (err) { console.error(err); msg.textContent = "저장하지 못했어요. 다시 로그인하거나 잠시 뒤 시도해 주세요."; }
}

// ---------- 식당 등록 ----------
function renderAdd() {
  const gate = $("#add-gate"), form = $("#add-form");
  if (!state.user) { gate.innerHTML = `<div class="empty-box"><b>로그인이 필요해요</b><p><a href="#me">학교 이메일로 로그인</a>하면 식당을 등록할 수 있어요.</p></div>`; form.hidden = true; return; }
  if (!loggedReady()) { gate.innerHTML = `<div class="empty-box"><b>닉네임과 학교를 먼저 정해 주세요</b><p><a href="#me">내 정보</a>에서 입력해 주세요.</p></div>`; form.hidden = true; return; }
  gate.innerHTML = ""; form.hidden = false;
  if (!$("#a-cat").options.length) {
    $("#a-cat").innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    $("#a-region").innerHTML = `<option value="">선택</option>` + regionOptions(state.region, false);
  }
}
async function submitAdd(e) {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const r = {
    name: v("#a-name"), category: v("#a-cat"), region: v("#a-region"), city: v("#a-city"),
    area: v("#a-area"), address: v("#a-address"), menu: v("#a-menu"), price: Math.round(Number(v("#a-price"))),
    hours: v("#a-hours"), closed: v("#a-closed"), desc: v("#a-desc"),
  };
  const msg = $("#add-msg");
  if (!r.region) { msg.textContent = "시·도를 골라 주세요."; return; }
  const dup = state.restaurants.find((x) => x.name.replace(/\s/g, "") === r.name.replace(/\s/g, "") && x.city === r.city);
  if (dup) { msg.innerHTML = `이미 등록된 식당이 있어요: <a href="#place-${esc(dup.id)}">${esc(dup.name)}</a>`; return; }
  msg.textContent = "등록 중…";
  try {
    const id = await Store.addRestaurant(r);
    $("#add-form").reset(); msg.textContent = "";
    if (state.region && state.region !== r.region) setRegion(r.region);
    location.hash = "#place-" + id;
  } catch (err) { console.error(err); msg.textContent = "등록하지 못했어요. 입력값과 로그인 상태를 확인해 주세요."; }
}

// ---------- 내 정보 / 로그인 ----------
function renderMe() {
  const body = $("#me-body");
  if (state.pendingEmailAsk) {
    $("#me-title").textContent = "로그인 마무리";
    body.innerHTML = `<form class="form form-narrow" id="confirm-form"><p class="hint">다른 기기에서 메일 링크를 열었어요. 로그인할 학교 이메일을 한 번 더 적어 주세요.</p>
      <label for="c-email">학교 이메일<input id="c-email" type="email" required></label><button class="btn" type="submit">로그인</button></form>`;
    $("#confirm-form").addEventListener("submit", (e) => { e.preventDefault(); const f = state.pendingEmailAsk; state.pendingEmailAsk = null; f($("#c-email").value.trim()); });
    return;
  }
  if (!state.user) {
    $("#me-title").textContent = "로그인";
    body.innerHTML = `
      <form class="form form-narrow" id="login-form">
        <p class="hint">대학 이메일(.ac.kr)로만 가입할 수 있어요. ${DEMO_MODE ? "데모 모드라 메일 없이 바로 로그인돼요." : "적은 주소로 로그인 링크를 보내 드려요. 비밀번호는 없어요."}</p>
        <label for="l-email">학교 이메일<input id="l-email" type="email" required placeholder="학번@학교.ac.kr" autocomplete="email"></label>
        <div class="form-foot"><button class="btn" type="submit">${DEMO_MODE ? "로그인" : "로그인 링크 받기"}</button><span class="form-msg" id="login-msg" aria-live="polite"></span></div>
      </form>`;
    $("#login-form").addEventListener("submit", sendLogin);
    return;
  }
  $("#me-title").textContent = "내 정보";
  const domain = (state.user.email || "").split("@")[1] || "";
  const myRatings = state.ratings.filter((x) => x.uid === state.user.uid);
  const myPlaces = state.restaurants.filter((x) => x.createdBy === state.user.uid);
  body.innerHTML = `
    <div class="me-layout">
      <form class="form" id="profile-form">
        <p class="form-title">공개 프로필 <small>(채점과 함께 보여요)</small></p>
        <p class="hint">로그인한 이메일: ${esc(state.user.email)} · 이메일 주소는 공개되지 않아요.</p>
        <p class="hint uid-row">내 사용자 ID: <code id="my-uid">${esc(state.user.uid)}</code> <button type="button" class="link-btn" id="copy-uid">복사</button>
          ${state.isAdmin ? `<span class="badge-hanki">운영진</span>` : ""}</p>
        <label for="p-nick">닉네임 *<input id="p-nick" required maxlength="12" value="${esc(state.profile?.nickname || "")}" placeholder="예: 국밥요정"></label>
        <label for="p-school">학교 *<input id="p-school" required maxlength="20" value="${esc(state.profile?.school || "")}" placeholder="예: 포항공과대학교"></label>
        <div class="form-foot"><button class="btn" type="submit">저장</button><button class="btn-ghost" type="button" id="logout">로그아웃</button><span class="form-msg" id="profile-msg" aria-live="polite"></span></div>
      </form>
      <div>
        <h2 class="sec-title">${regionLabel()}에서 내가 채점한 식당 <small>${myRatings.length}곳</small></h2>
        ${myRatings.length ? `<ul class="reviews">${myRatings.map((x) => ratingItemHTML(x, true)).join("")}</ul>` : `<p class="hint">아직 없어요.</p>`}
        <h2 class="sec-title">내가 등록한 식당 <small>${myPlaces.length}곳</small></h2>
        ${myPlaces.length ? `<ul class="mini-list">${myPlaces.map((r) => `<li><a href="#place-${esc(r.id)}"><b>${esc(r.name)}</b><span>${esc(r.city)}</span></a></li>`).join("")}</ul>` : `<p class="hint">아직 없어요.</p>`}
        ${state.isAdmin && !DEMO_MODE ? `<h2 class="sec-title">운영진 도구</h2>
          <p class="hint">처음 한 번, 포항 식당 ${SEED_RESTAURANTS.length}곳을 넣을 수 있어요.</p>
          <button class="btn-ghost" id="seed-btn">포항 예시 식당 불러오기</button> <span class="form-msg" id="seed-msg"></span>` : ""}
      </div>
    </div>`;
  if (!state.profile) $("#p-school").value = $("#p-school").value || "";
  $("#profile-form").addEventListener("submit", saveProfile);
  $("#logout").addEventListener("click", () => Store.signOut());
  $("#copy-uid").addEventListener("click", async (e) => {
    try { await navigator.clipboard.writeText(state.user.uid); e.target.textContent = "복사됨"; }
    catch { const r = document.createRange(); r.selectNodeContents($("#my-uid")); getSelection().removeAllRanges(); getSelection().addRange(r); }
  });
  $("#seed-btn")?.addEventListener("click", async () => {
    $("#seed-msg").textContent = "넣는 중…";
    try { const n = await Store.seed(); $("#seed-msg").textContent = `${n}곳을 넣었어요`; } catch { $("#seed-msg").textContent = "실패했어요. 운영진 권한을 확인해 주세요."; }
  });
  void domain;
}
async function sendLogin(e) {
  e.preventDefault();
  const email = $("#l-email").value.trim().toLowerCase();
  const msg = $("#login-msg");
  if (!SITE.allowedEmail.test(email)) { msg.textContent = "대학 이메일(.ac.kr)만 쓸 수 있어요. Gmail·네이버 같은 개인 메일은 안 돼요."; return; }
  msg.textContent = "보내는 중…";
  try {
    const res = await Store.sendLoginLink(email);
    msg.textContent = res.instant ? "" : `${email}로 로그인 링크를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.`;
  } catch (err) { console.error(err); msg.textContent = loginErrorText(err); }
}
// Firebase 오류 코드를 사람이 읽을 수 있는 말로
function loginErrorText(err) {
  const map = {
    "auth/operation-not-allowed": "Firebase에서 '이메일 링크' 로그인이 꺼져 있어요. (Authentication → 로그인 방법)",
    "auth/unauthorized-continue-uri": "이 사이트 주소가 Firebase '승인된 도메인'에 없어요.",
    "auth/unauthorized-domain": "이 사이트 주소가 Firebase '승인된 도메인'에 없어요.",
    "auth/invalid-email": "이메일 주소 형식이 올바르지 않아요.",
    "auth/quota-exceeded": "오늘 보낼 수 있는 로그인 메일 수를 넘었어요. 내일 다시 시도해 주세요.",
    "auth/too-many-requests": "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.",
    "auth/invalid-action-code": "로그인 링크가 만료됐거나 이미 사용됐어요. 링크를 새로 받아 주세요.",
    "auth/expired-action-code": "로그인 링크가 만료됐어요. 링크를 새로 받아 주세요.",
    "auth/invalid-api-key": "Firebase 설정값(apiKey)이 올바르지 않아요.",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
  };
  return (map[err?.code] || "로그인하지 못했어요.") + (err?.code ? ` [${err.code}]` : "");
}
async function saveProfile(e) {
  e.preventDefault();
  const p = { nickname: $("#p-nick").value.trim(), school: $("#p-school").value.trim(), domain: (state.user.email || "").split("@")[1] || "" };
  const msg = $("#profile-msg");
  try { await Store.saveProfile(state.user.uid, p); state.profile = p; msg.textContent = "저장했어요"; }
  catch { msg.textContent = "저장하지 못했어요."; }
}

// ---------- 정적 페이지 ----------
function renderStatic() {
  $("#crit-grid").innerHTML = CRITERIA.map((c) => `<div class="crit"><b>${c.label}</b><span>${c.help}</span></div>`).join("");
  $("#legend").innerHTML = `
    <div class="legend-item"><span class="stars s3" aria-hidden="true">★★★</span><b>일부러 찾아갈 집</b><span>5개 항목 평균 4.5점 이상</span></div>
    <div class="legend-item"><span class="stars s2" aria-hidden="true">★★</span><b>근처라면 꼭 갈 집</b><span>4.0점 이상</span></div>
    <div class="legend-item"><span class="stars s1" aria-hidden="true">★</span><b>믿고 가는 한 끼</b><span>3.5점 이상 · 채점 ${SITE.minRaters}명 이상일 때만</span></div>
    <div class="legend-item"><span class="badge-hanki">한 끼 추천</span><b>가성비 배지</b><span>대표 메뉴 ${won(SITE.hankiPrice)} 이하 + 가성비 4.0점 이상</span></div>`;
  $("#team-grid").innerHTML = TEAM.map((t) => `<div class="team-card"><b>${esc(t.name)}</b><span>${esc(t.role)}</span></div>`).join("");
}

// ---------- 데이터 구독 ----------
let unsubs = [];
function setRegion(region) {
  state.region = region; state.city = "";
  state.loaded = { r: false, s: false };
  unsubs.forEach((u) => u());
  unsubs = [
    Store.watchRestaurants(region, (list) => { state.restaurants = list; state.loaded.r = true; refresh(); }),
    Store.watchRatings(region, (list) => { state.ratings = list; state.loaded.s = true; refresh(); }),
  ];
  try { localStorage.setItem("hanki-region", region); } catch {}
  refresh();
}
function refresh() {
  if (document.activeElement?.closest?.("form") && ["place", "me", "add"].includes(state.page)) return;
  renderPage();
}

// ---------- 라우팅 ----------
const PAGES = ["home", "guide", "place", "add", "criteria", "about", "me"];
function renderPage() {
  ({ home: renderHome, guide: renderGuide, place: renderPlace, add: renderAdd, me: renderMe }[state.page] || (() => {}))();
  $("#me-link").textContent = state.user ? (state.profile?.nickname || "내 정보") : "로그인";
}
function route() {
  const h = location.hash.replace("#", "");
  if (h.startsWith("place-")) { state.page = "place"; state.placeId = h.slice(6); }
  else state.page = PAGES.includes(h) ? h : "home";
  state.confirmDelete = null;
  PAGES.forEach((p) => ($("#page-" + p).hidden = p !== state.page));
  document.querySelectorAll("#nav a").forEach((a) => {
    const on = a.dataset.page === state.page || (state.page === "place" && a.dataset.page === "guide");
    a.classList.toggle("is-on", on); a.setAttribute("aria-current", on ? "page" : "false");
  });
  const r = state.page === "place" ? byId(state.placeId) : null;
  document.title = r ? `${r.name} · ${SITE.name}` : SITE.name;
  renderPage();
  window.scrollTo(0, 0);
}

// ---------- 시작 ----------
function bind() {
  window.addEventListener("hashchange", route);
  $("#home-region").addEventListener("change", (e) => setRegion(e.target.value));
  $("#g-region").addEventListener("change", (e) => setRegion(e.target.value));
  $("#g-city").addEventListener("change", (e) => { state.city = e.target.value; renderGuide(); });
  $("#g-cat").addEventListener("change", (e) => { state.cat = e.target.value; renderGuide(); });
  $("#search").addEventListener("input", (e) => { state.query = e.target.value; renderGuide(); });
  $("#filter").addEventListener("change", (e) => { state.filter = e.target.value; renderGuide(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGuide(); });
  $("#add-form").addEventListener("submit", submitAdd);
  if (DEMO_MODE) { $("#demo-banner").hidden = false; $("#demo-reset").addEventListener("click", () => DemoStore.resetDemo()); }
}

async function start() {
  bind();
  renderStatic();
  let saved = "";
  try { saved = localStorage.getItem("hanki-region") || ""; } catch {}
  setRegion(REGIONS.includes(saved) ? saved : "");
  route();

  Store.onAuth(async (u) => {
    state.user = u;
    state.profile = u ? await Store.getProfile(u.uid).catch(() => null) : null;
    state.isAdmin = u ? await Store.isAdmin(u.uid) : false;
    if (u && !loggedReady() && state.page === "me") { /* 프로필 입력 화면 유지 */ }
    renderPage();
  });

  // 메일 링크로 돌아온 경우 로그인 마무리
  try {
    await Store.finishLoginIfLink(() => new Promise((resolve) => {
      state.pendingEmailAsk = resolve; location.hash = "#me"; route();
    }));
  } catch (err) {
    console.error(err);
    location.hash = "#me"; route();
    const box = document.createElement("p");
    box.className = "error-box"; box.textContent = loginErrorText(err);
    $("#me-body").prepend(box);
  }
}
start();

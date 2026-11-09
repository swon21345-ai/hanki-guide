// =============================================================
//  map.js — 카카오맵 연동
//  - 지도를 움직이면 화면 안의 실제 음식점(FD6)·카페(CE7)를 카카오에서 검색
//  - 키워드 검색 (예: "포항 국밥")
//  - 가이드에 등록된 식당은 별과 함께 강조 표시
//  - 카카오 장소를 눌러 바로 가이드에 등록하고 채점
//  필요: config.js의 KAKAO_JS_KEY + 카카오 개발자 콘솔에 사이트 도메인 등록
// =============================================================

const REGION_CENTER = {
  "": [36.0190, 129.3435], 서울: [37.5665, 126.9780], 부산: [35.1796, 129.0756], 대구: [35.8714, 128.6014],
  인천: [37.4563, 126.7052], 광주: [35.1595, 126.8526], 대전: [36.3504, 127.3845], 울산: [35.5384, 129.3114],
  세종: [36.4800, 127.2890], 경기: [37.2636, 127.0286], 강원: [37.8813, 127.7298], 충북: [36.6424, 127.4890],
  충남: [36.6588, 126.6728], 전북: [35.8242, 127.1480], 전남: [34.8161, 126.4629], 경북: [36.0190, 129.3435],
  경남: [35.2280, 128.6811], 제주: [33.4996, 126.5312],
};

const KMap = {
  map: null, places: null, overlays: [], results: [], selected: null,
  guideOnly: false, loading: null, lastQuery: "",
};

// ---------- SDK 불러오기 ----------
function kakaoReady() {
  if (KMap.loading) return KMap.loading;
  KMap.loading = new Promise((ok, fail) => {
    if (!KAKAO_JS_KEY || KAKAO_JS_KEY.startsWith("여기에")) return fail(new Error("no-key"));
    if (window.kakao?.maps) return kakao.maps.load(ok);
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
    s.onload = () => (window.kakao?.maps ? kakao.maps.load(ok) : fail(new Error("load")));
    s.onerror = () => fail(new Error("load"));
    document.head.appendChild(s);
  });
  return KMap.loading;
}

// ---------- 카카오 장소 → 가이드 형식 ----------
const REGION_ALIAS = { 서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천", 광주광역시: "광주",
  대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종", 경기도: "경기", 강원특별자치도: "강원", 강원도: "강원",
  충청북도: "충북", 충청남도: "충남", 전북특별자치도: "전북", 전라북도: "전북", 전라남도: "전남", 경상북도: "경북",
  경상남도: "경남", 제주특별자치도: "제주" };
function regionOf(addr) {
  const first = (addr || "").split(" ")[0];
  if (REGIONS.includes(first)) return first;
  return REGION_ALIAS[first] || REGIONS.find((r) => first.startsWith(r)) || "";
}
function categoryOf(p) {
  const c = p.category_name || "";
  if (p.category_group_code === "CE7" || /카페|디저트|제과|베이커리|아이스크림|떡/.test(c)) return "cafe";
  if (/해물|생선|회|조개|게|대게|복어|장어|해산물/.test(c)) return "seafood";
  if (/분식|국수|칼국수|냉면|간식|떡볶이|도시락|김밥|만두/.test(c)) return "snack";
  if (/양식|중식|중국|일식|일본|아시아|패스트푸드|피자|치킨|햄버거|이탈리안|멕시칸|태국|베트남|인도/.test(c)) return "global";
  return "korean";
}
function guideIdOf(p) { return "kakao-" + p.id; }
function toGuide(p, menu, price, category) {
  const addr = p.road_address_name || p.address_name || "";
  const parts = (p.address_name || addr).split(" ");
  const region = regionOf(p.address_name || addr);
  return {
    name: p.place_name.slice(0, 40), category: category || categoryOf(p),
    region, city: (parts[1] || region).slice(0, 20),
    area: (parts[2] || "").slice(0, 30), address: addr.slice(0, 80),
    menu: menu.slice(0, 30), price, hours: "", closed: "", desc: "",
    phone: p.phone || "", placeUrl: p.place_url || "", kakaoId: String(p.id),
    lat: Number(p.y), lng: Number(p.x),
  };
}

// ---------- 지도 페이지 ----------
async function renderMap() {
  const box = $("#map-canvas");
  try { await kakaoReady(); }
  catch (e) {
    $("#map-status").innerHTML = e.message === "no-key"
      ? `<b>카카오맵 키가 아직 없어요.</b> config.js의 <code>KAKAO_JS_KEY</code>에 카카오 JavaScript 키를 넣으면 지도가 나와요.`
      : `<b>카카오맵을 불러오지 못했어요.</b> 카카오 개발자 콘솔의 [플랫폼 → Web]에 이 사이트 주소가 등록됐는지, [카카오맵] 사용이 켜져 있는지 확인해 주세요.`;
    $("#map-status").hidden = false;
    return;
  }
  if (!KMap.map) {
    const [la, ln] = REGION_CENTER[state.region] || REGION_CENTER[""];
    KMap.map = new kakao.maps.Map(box, { center: new kakao.maps.LatLng(la, ln), level: 4 });
    KMap.places = new kakao.maps.services.Places();
    kakao.maps.event.addListener(KMap.map, "idle", debounce(() => { if (!KMap.lastQuery) searchArea(); }, 500));
    searchArea();
  } else {
    KMap.map.relayout();
    drawMarkers();
  }
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function centerOnRegion(region) {
  if (!KMap.map) return;
  const [la, ln] = REGION_CENTER[region] || REGION_CENTER[""];
  KMap.lastQuery = ""; $("#map-q").value = "";
  KMap.map.setCenter(new kakao.maps.LatLng(la, ln)); KMap.map.setLevel(5);
}

// 화면 안의 음식점 + 카페 (각 최대 45곳: 카카오 API 한도)
function searchArea() {
  if (!KMap.places || KMap.guideOnly) { KMap.results = []; drawMarkers(); return; }
  const bounds = KMap.map.getBounds();
  const found = {};
  let pending = 2;
  setMapNote("주변 식당을 찾는 중…");
  ["FD6", "CE7"].forEach((code) => {
    const collect = (data, status, pg) => {
      if (status === kakao.maps.services.Status.OK) data.forEach((p) => (found[p.id] = p));
      if (status === kakao.maps.services.Status.OK && pg?.hasNextPage && pg.current < 3) return pg.nextPage();
      if (--pending === 0) { KMap.results = Object.values(found); drawMarkers(); }
    };
    KMap.places.categorySearch(code, collect, { bounds, useMapBounds: true });
  });
}
function searchKeyword(q) {
  if (!KMap.places) return;
  KMap.lastQuery = q;
  const found = {};
  setMapNote(`"${q}" 검색 중…`);
  KMap.places.keywordSearch(q, (data, status, pg) => {
    if (status === kakao.maps.services.Status.OK) data.filter((p) => ["FD6", "CE7"].includes(p.category_group_code)).forEach((p) => (found[p.id] = p));
    if (status === kakao.maps.services.Status.OK && pg?.hasNextPage && pg.current < 3) return pg.nextPage();
    KMap.results = Object.values(found);
    if (KMap.results.length) {
      const b = new kakao.maps.LatLngBounds();
      KMap.results.forEach((p) => b.extend(new kakao.maps.LatLng(p.y, p.x)));
      KMap.map.setBounds(b);
    }
    drawMarkers();
  });
}
function setMapNote(t) { const n = $("#map-note"); if (n) n.textContent = t; }

// ---------- 마커와 목록 ----------
function guideByKakaoId(kid) { return state.restaurants.find((r) => r.kakaoId === String(kid)); }

function drawMarkers() {
  if (!KMap.map) return;
  KMap.overlays.forEach((o) => o.setMap(null));
  KMap.overlays = [];
  const items = [];

  // 가이드 식당 (좌표 있는 것)
  state.restaurants.filter((r) => typeof r.lat === "number").forEach((r) => {
    items.push({ kind: "guide", r, s: summary(r), lat: r.lat, lng: r.lng, key: "g-" + r.id });
  });
  // 카카오 장소 (이미 가이드에 있으면 가이드 쪽으로 합침)
  if (!KMap.guideOnly) KMap.results.forEach((p) => {
    if (guideByKakaoId(p.id)) return;
    items.push({ kind: "kakao", p, lat: Number(p.y), lng: Number(p.x), key: "k-" + p.id });
  });

  items.forEach((it) => {
    const el = document.createElement("button");
    el.type = "button";
    if (it.kind === "guide") {
      el.className = "pin pin-guide" + (KMap.selected === it.key ? " is-on" : "");
      el.textContent = it.s.stars ? "★".repeat(it.s.stars) : it.r.name.slice(0, 8);
      el.title = it.r.name;
    } else {
      el.className = "pin pin-kakao" + (KMap.selected === it.key ? " is-on" : "");
      el.title = it.p.place_name;
      el.setAttribute("aria-label", it.p.place_name);
    }
    el.addEventListener("click", () => selectItem(it));
    const ov = new kakao.maps.CustomOverlay({ position: new kakao.maps.LatLng(it.lat, it.lng), content: el, yAnchor: 1, clickable: true });
    ov.setMap(KMap.map);
    KMap.overlays.push(ov);
  });

  const guideCount = items.filter((i) => i.kind === "guide").length;
  setMapNote(KMap.guideOnly ? `가이드 식당 ${guideCount}곳 (좌표가 있는 곳)`
    : `이 화면의 식당 ${items.length}곳 · 가이드 등록 ${guideCount}곳${KMap.results.length >= 85 ? " · 지도를 확대하면 더 보여요" : ""}`);

  $("#map-list").innerHTML = items.length ? items
    .sort((a, b) => (a.kind === "guide" ? -1 : 0) - (b.kind === "guide" ? -1 : 0))
    .map((it) => it.kind === "guide"
      ? `<li><button type="button" data-key="${it.key}" class="${KMap.selected === it.key ? "is-on" : ""}"><b>${esc(it.r.name)}</b>
          <span class="ml-meta">${it.s.stars ? `<span class="stars">${"★".repeat(it.s.stars)}</span> ` : ""}가이드 · 채점 ${it.s.count}명</span></button></li>`
      : `<li><button type="button" data-key="${it.key}" class="${KMap.selected === it.key ? "is-on" : ""}"><b>${esc(it.p.place_name)}</b>
          <span class="ml-meta">${esc((it.p.category_name || "").split(" > ").slice(-1)[0])} · ${esc(it.p.road_address_name || it.p.address_name)}</span></button></li>`).join("")
    : `<li class="ml-empty">이 화면에 식당이 없어요. 지도를 옮기거나 검색해 보세요.</li>`;
  $("#map-list").querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => selectItem(items.find((i) => i.key === b.dataset.key), true)));
  KMap._items = items;
}

function selectItem(it, pan) {
  if (!it) return;
  KMap.selected = it.key;
  if (pan) KMap.map.panTo(new kakao.maps.LatLng(it.lat, it.lng));
  const panel = $("#map-panel");
  panel.hidden = false;
  if (it.kind === "guide") {
    const r = it.r, s = it.s;
    panel.innerHTML = `
      <p class="eyebrow">가이드 등록 식당 · ${catName(r.category)}</p>
      <h2>${esc(r.name)}</h2>
      <div class="m-rating">${starHTML(s)} ${s.hanki ? `<span class="badge-hanki">한 끼 추천</span>` : ""}</div>
      <p class="hint">${esc(r.address || "")}${r.phone ? " · " + esc(r.phone) : ""}</p>
      <div class="form-foot"><a class="btn" href="#place-${esc(r.id)}">자세히 보고 채점하기</a>${r.placeUrl ? `<a class="btn-ghost" href="${esc(r.placeUrl)}" target="_blank" rel="noopener">카카오맵 정보</a>` : ""}</div>`;
  } else {
    const p = it.p;
    const cat = categoryOf(p);
    panel.innerHTML = `
      <p class="eyebrow">카카오맵 장소 · 아직 가이드에 없음</p>
      <h2>${esc(p.place_name)}</h2>
      <p class="hint">${esc(p.category_name || "")}<br>${esc(p.road_address_name || p.address_name)}${p.phone ? " · " + esc(p.phone) : ""}</p>
      <p class="form-foot"><a class="btn-ghost" href="${esc(p.place_url)}" target="_blank" rel="noopener">카카오맵에서 메뉴·사진 보기</a></p>
      ${!state.user ? `<div class="empty-box"><b>가이드에 올리고 채점하려면 로그인하세요</b><p><a href="#me">학교 이메일로 로그인</a></p></div>`
        : !loggedReady() ? `<div class="empty-box"><b>닉네임과 학교를 먼저 정해 주세요</b><p><a href="#me">내 정보</a></p></div>`
        : `<form class="form" id="kreg-form">
            <p class="form-title">가이드에 등록하고 채점하기</p>
            <div class="form-grid">
              <label for="k-cat">종류<select id="k-cat">${CATEGORIES.map((c) => `<option value="${c.id}"${c.id === cat ? " selected" : ""}>${c.name}</option>`).join("")}</select></label>
              <label for="k-menu">대표 메뉴 *<input id="k-menu" required maxlength="30" placeholder="카카오맵에서 확인"></label>
              <label for="k-price">대표 메뉴 가격(원) *<input id="k-price" required type="number" min="0" max="1000000" step="100"></label>
            </div>
            <div class="form-foot"><button class="btn" type="submit">등록하고 채점하러 가기</button><span class="form-msg" id="kreg-msg" aria-live="polite"></span></div>
          </form>`}`;
    $("#kreg-form")?.addEventListener("submit", (e) => registerKakao(e, p));
  }
  drawMarkers();
}

async function registerKakao(e, p) {
  e.preventDefault();
  const msg = $("#kreg-msg");
  const r = toGuide(p, $("#k-menu").value.trim(), Math.round(Number($("#k-price").value)), $("#k-cat").value);
  if (!r.region) { msg.textContent = "주소에서 시·도를 알 수 없어 등록할 수 없어요."; return; }
  msg.textContent = "등록 중…";
  try {
    const id = guideIdOf(p);
    const exists = await Store.getRestaurant(id);
    if (!exists) await Store.addRestaurantWithId(id, r);
    if (state.region && state.region !== r.region) setRegion(r.region);
    location.hash = "#place-" + id;
  } catch (err) { console.error(err); msg.textContent = "등록하지 못했어요. 로그인 상태를 확인해 주세요."; }
}

// ---------- 식당 상세의 작은 지도 ----------
async function renderMiniMap(r) {
  const el = $("#mini-map");
  if (!el || typeof r.lat !== "number") return;
  try { await kakaoReady(); } catch { el.hidden = true; return; }
  const pos = new kakao.maps.LatLng(r.lat, r.lng);
  const m = new kakao.maps.Map(el, { center: pos, level: 3, draggable: false });
  new kakao.maps.Marker({ position: pos, map: m });
}

// ---------- 지도 페이지 이벤트 ----------
function bindMap() {
  $("#map-search").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#map-q").value.trim();
    if (q) searchKeyword(q); else { KMap.lastQuery = ""; searchArea(); }
  });
  $("#map-here").addEventListener("click", () => { KMap.lastQuery = ""; $("#map-q").value = ""; searchArea(); });
  $("#map-guide-only").addEventListener("change", (e) => { KMap.guideOnly = e.target.checked; searchArea(); });
  $("#map-locate").addEventListener("click", () => {
    if (!navigator.geolocation || !KMap.map) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { KMap.lastQuery = ""; KMap.map.setCenter(new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude)); KMap.map.setLevel(3); },
      () => setMapNote("위치를 가져오지 못했어요. 브라우저의 위치 권한을 확인해 주세요."));
  });
}

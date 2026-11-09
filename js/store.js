// =============================================================
//  store.js — 로그인과 데이터 저장
//  같은 함수 이름으로 두 가지 구현이 있습니다.
//   1) FirebaseStore : 실제 배포용 (Firebase 인증 + Firestore)
//   2) DemoStore     : 설정 전 시연용 (내 브라우저에만 저장)
//  app.js는 Store.xxx() 만 부르므로 어느 쪽인지 신경 쓰지 않아도 됩니다.
//
//  데이터 구조 (Firestore)
//   restaurants/{자동id} : name, region, city, area, category, menu, price,
//                          address, hours, closed, desc, createdBy, createdAt
//   ratings/{식당id_사용자id} : restaurantId, region, uid, nickname, school,
//                          taste, value, portion, solo, access, text, updatedAt
//   users/{사용자id}      : nickname, school, email(저장 안 함), domain
//   admins/{사용자id}     : 운영진 표시용 (콘솔에서 직접 만듦)
// =============================================================

// ---------- 데모 모드 ----------
const DemoStore = (() => {
  const mem = {};
  const KEY = "hanki-demo-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return mem[KEY] || null; } };
  const save = (d) => { mem[KEY] = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
  let data = load() || { restaurants: {}, ratings: {}, users: {}, me: null };
  if (!Object.keys(data.restaurants).length) {
    SEED_RESTAURANTS.forEach((r) => (data.restaurants[r.id] = { ...r, createdBy: "seed", createdAt: Date.now() }));
    save(data);
  }
  const listeners = { auth: [], restaurants: [], ratings: [] };
  const emit = (k) => listeners[k].forEach((f) => f());
  const meUser = () => (data.me ? { uid: data.me, email: data.me.replace("demo-", "") } : null);

  return {
    mode: "demo",
    onAuth(fn) { listeners.auth.push(() => fn(meUser())); setTimeout(() => fn(meUser()), 0); },
    async sendLoginLink(email) {           // 데모: 메일 없이 바로 로그인
      data.me = "demo-" + email.toLowerCase(); save(data); emit("auth");
      return { instant: true };
    },
    async finishLoginIfLink() { return false; },
    async signOut() { data.me = null; save(data); emit("auth"); },
    async isAdmin() { return !!data.me; }, // 데모에서는 로그인하면 운영진 기능도 체험 가능
    async getProfile(uid) { return data.users[uid] || null; },
    async saveProfile(uid, p) { data.users[uid] = p; save(data); },

    watchRestaurants(region, fn) {
      const run = () => fn(Object.entries(data.restaurants).map(([id, r]) => ({ ...r, id }))
        .filter((r) => !region || r.region === region));
      listeners.restaurants.push(run); run();
      return () => (listeners.restaurants = listeners.restaurants.filter((f) => f !== run));
    },
    watchRatings(region, fn) {
      const run = () => fn(Object.values(data.ratings).filter((x) => !region || x.region === region));
      listeners.ratings.push(run); run();
      return () => (listeners.ratings = listeners.ratings.filter((f) => f !== run));
    },
    async addRestaurant(r) {
      const id = "r" + Date.now().toString(36);
      data.restaurants[id] = { ...r, createdBy: data.me, createdAt: Date.now() }; save(data); emit("restaurants");
      return id;
    },
    async getRestaurant(id) { return data.restaurants[id] ? { ...data.restaurants[id], id } : null; },
    async addRestaurantWithId(id, r) {
      data.restaurants[id] = { ...r, createdBy: data.me, createdAt: Date.now() }; save(data); emit("restaurants");
      return id;
    },
    async deleteRestaurant(id) {
      delete data.restaurants[id];
      Object.keys(data.ratings).forEach((k) => { if (k.startsWith(id + "_")) delete data.ratings[k]; });
      save(data); emit("restaurants"); emit("ratings");
    },
    async saveRating(r) { data.ratings[r.restaurantId + "_" + r.uid] = { ...r, updatedAt: Date.now() }; save(data); emit("ratings"); },
    async deleteRating(restaurantId, uid) { delete data.ratings[restaurantId + "_" + uid]; save(data); emit("ratings"); },
    async seed() { return 0; },
    resetDemo() { try { localStorage.removeItem(KEY); } catch {} delete mem[KEY]; location.reload(); },
  };
})();

// ---------- 실제 배포 (Firebase) ----------
const FirebaseStore = (() => {
  let auth, db;
  const ready = DEMO_MODE ? new Promise(() => {}) : (async () => {
    const v = "10.12.2";
    for (const f of ["firebase-app-compat", "firebase-auth-compat", "firebase-firestore-compat"]) {
      await new Promise((ok, fail) => {
        const s = document.createElement("script");
        s.src = `https://www.gstatic.com/firebasejs/${v}/${f}.js`;
        s.onload = ok; s.onerror = () => fail(new Error("Firebase를 불러오지 못했어요"));
        document.head.appendChild(s);
      });
    }
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth(); db = firebase.firestore();
  })();
  const ts = () => firebase.firestore.FieldValue.serverTimestamp();
  const toMs = (t) => (t?.toMillis ? t.toMillis() : t || 0);

  return {
    mode: "firebase",
    ready,
    onAuth(fn) { ready.then(() => auth.onAuthStateChanged((u) => fn(u ? { uid: u.uid, email: u.email } : null))); },
    async sendLoginLink(email) {
      await ready;
      const url = location.origin + location.pathname;   // 메일 링크를 누르면 이 주소로 돌아옴
      await auth.sendSignInLinkToEmail(email, { url, handleCodeInApp: true });
      try { localStorage.setItem("hanki-login-email", email); } catch {}
      return { instant: false };
    },
    // 메일 링크로 돌아왔을 때 로그인 마무리. 다른 기기에서 열었으면 이메일을 다시 물어봄
    async finishLoginIfLink(askEmail) {
      await ready;
      if (!auth.isSignInWithEmailLink(location.href)) return false;
      let email = null;
      try { email = localStorage.getItem("hanki-login-email"); } catch {}
      if (!email) email = await askEmail();
      if (!email) return false;
      await auth.signInWithEmailLink(email, location.href);
      try { localStorage.removeItem("hanki-login-email"); } catch {}
      history.replaceState(null, "", location.pathname + "#me");
      return true;
    },
    async signOut() { await ready; await auth.signOut(); },
    async isAdmin(uid) {
      await ready;
      try { return (await db.doc("admins/" + uid).get()).exists; } catch { return false; }
    },
    async getProfile(uid) { await ready; const d = await db.doc("users/" + uid).get(); return d.exists ? d.data() : null; },
    async saveProfile(uid, p) { await ready; await db.doc("users/" + uid).set(p); },

    watchRestaurants(region, fn) {
      let unsub = () => {};
      ready.then(() => {
        let q = db.collection("restaurants");
        q = region ? q.where("region", "==", region) : q.orderBy("createdAt", "desc").limit(500);
        unsub = q.onSnapshot((s) => fn(s.docs.map((d) => ({ ...d.data(), id: d.id, createdAt: toMs(d.data().createdAt) }))),
          (e) => console.error("식당 목록 오류", e));
      });
      return () => unsub();
    },
    watchRatings(region, fn) {
      let unsub = () => {};
      ready.then(() => {
        let q = db.collection("ratings");
        q = region ? q.where("region", "==", region) : q.orderBy("updatedAt", "desc").limit(2000);
        unsub = q.onSnapshot((s) => fn(s.docs.map((d) => ({ ...d.data(), updatedAt: toMs(d.data().updatedAt) }))),
          (e) => console.error("채점 목록 오류", e));
      });
      return () => unsub();
    },
    async addRestaurant(r) {
      await ready;
      const ref = await db.collection("restaurants").add({ ...r, createdBy: auth.currentUser.uid, createdAt: ts() });
      return ref.id;
    },
    async getRestaurant(id) {
      await ready;
      const d = await db.doc("restaurants/" + id).get();
      return d.exists ? { ...d.data(), id: d.id, createdAt: toMs(d.data().createdAt) } : null;
    },
    async addRestaurantWithId(id, r) {
      await ready;
      await db.doc("restaurants/" + id).set({ ...r, createdBy: auth.currentUser.uid, createdAt: ts() });
      return id;
    },
    async deleteRestaurant(id) { await ready; await db.doc("restaurants/" + id).delete(); },
    async saveRating(r) { await ready; await db.doc(`ratings/${r.restaurantId}_${r.uid}`).set({ ...r, updatedAt: ts() }); },
    async deleteRating(restaurantId, uid) { await ready; await db.doc(`ratings/${restaurantId}_${uid}`).delete(); },
    // 운영진 전용: data.js의 포항 식당을 처음 한 번 넣기
    async seed() {
      await ready;
      const batch = db.batch();
      SEED_RESTAURANTS.forEach(({ id, ...r }) =>
        batch.set(db.doc("restaurants/" + id), { ...r, createdBy: auth.currentUser.uid, createdAt: ts() }));
      await batch.commit();
      return SEED_RESTAURANTS.length;
    },
  };
})();

const Store = DEMO_MODE ? DemoStore : FirebaseStore;

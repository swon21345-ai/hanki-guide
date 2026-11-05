// =============================================================
//  data.js — 지역·카테고리 목록과 첫 데이터(포항 식당 14곳)
//  SEED_RESTAURANTS는 운영진이 '예시 식당 불러오기'로 한 번 넣는 초기 데이터입니다.
//  가격·영업시간은 출처 게시 시점 기준이니 바뀌었을 수 있어요.
// =============================================================

const REGIONS = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];

const CATEGORIES = [
  { id: "korean",  name: "한식·밥집" },
  { id: "seafood", name: "바다·해산물" },
  { id: "snack",   name: "분식·국수·간식" },
  { id: "global",  name: "양식·중식·일식" },
  { id: "cafe",    name: "카페·디저트" },
];

const CHECK = "방문 전 확인";

const SEED_RESTAURANTS = [
  // ---------------- 바다·해산물 ----------------
  { id: "pohang-1", region: "경북", city: "포항시", category: "seafood", name: "해구식당", menu: "청어·꽁치 과메기", price: 25000,
    area: "죽도시장 인근", address: "포항시 북구 중앙상가2길",
    hours: "09:00–23:00", closed: "3월~10월 중순 (과메기 비수기)",
    desc: "청어과메기와 꽁치과메기를 내는 과메기 전문점. 과메기가 나오는 겨울철에만 영업한다.",
    tags: ["제철", "겨울 추천"], sourceUrl: "https://hotplacehunter.co.kr/local/article/50382/" },
  { id: "pohang-2", region: "경북", city: "포항시", category: "seafood", name: "삼경해물탕", menu: "아구탕", price: 15000,
    area: "남구 동해안로", address: "포항시 남구 동해안로",
    hours: "월–토 11:00–14:00 (점심만)", closed: "일요일",
    desc: "아구탕과 아구찜(소 35,000원)을 파는 점심 전용 해물탕집.",
    tags: ["점심만", "해장"], sourceUrl: "https://hotplacehunter.co.kr/sns/article/88737/" },
  { id: "pohang-3", region: "경북", city: "포항시", category: "seafood", name: "영일대한티재", menu: "전복해물뚝배기", price: 15000,
    area: "영일대", address: "포항시 북구 삼호로",
    hours: "11:00–21:30 (브레이크 15:00–17:00)", closed: CHECK,
    desc: "전복해물뚝배기, 해물순두부와 보쌈(12,000원), 여럿이 먹는 영일대전골세트(75,000원)가 있다.",
    tags: ["바다 근처", "단체 가능"], sourceUrl: "https://hotplacehunter.co.kr/local/article/50382/" },
  { id: "pohang-4", region: "경북", city: "포항시", category: "seafood", name: "구룡포 목원대게", menu: "붉은대게찜", price: 100000, priceLabel: "시가 (10만원~)",
    area: "구룡포", address: "포항시 남구 구룡포읍",
    hours: CHECK, closed: CHECK,
    desc: "계절에 따라 가격이 바뀌는 붉은대게찜과 게딱지 볶음밥, 해물 샤브샤브를 낸다.",
    tags: ["가족 외식", "시가"], sourceUrl: "https://autoreserve.com/it/restaurants/6JJSkyxcLdNCWQ43iak2" },

  // ---------------- 한식·밥집 ----------------
  { id: "pohang-5", region: "경북", city: "포항시", category: "korean", name: "평남식당", menu: "소머리곰탕", price: 15000,
    area: "죽도시장", address: "포항시 북구 죽도시장 일대",
    hours: "07:30–19:30 (브레이크 14:00–16:00)", closed: "월요일",
    desc: "아침부터 문을 여는 소머리곰탕집. 한우수육(소 45,000원)도 있다.",
    tags: ["아침 식사", "시장"], sourceUrl: "https://hotplacehunter.co.kr/sns/article/88737/" },
  { id: "pohang-6", region: "경북", city: "포항시", category: "korean", name: "인천식당", menu: "두루치기", price: 12000,
    area: "중앙로", address: "포항시 북구 중앙로",
    hours: "월–토 10:30–20:00", closed: "일요일",
    desc: "두루치기와 된장찌개(9,000원), 김치찌개(10,000원)를 파는 밥집.",
    tags: ["혼밥", "가성비"], sourceUrl: "https://hotplacehunter.co.kr/local/article/50382/" },
  { id: "pohang-7", region: "경북", city: "포항시", category: "korean", name: "진주식당", menu: "닭백숙", price: 70000,
    area: "송라면 (보경사 인근)", address: "포항시 북구 송라면",
    hours: "11:30–18:00", closed: CHECK,
    desc: "내연산 보경사 근처의 백숙집. 오리백숙·옻오리백숙도 있어 등산 후 여럿이 가기 좋다.",
    tags: ["단체 가능", "등산 후"], sourceUrl: "https://hotplacehunter.co.kr/sns/article/88737/" },

  // ---------------- 국수·간식 ----------------
  { id: "pohang-8", region: "경북", city: "포항시", category: "snack", name: "까꾸네 모리국수", menu: "모리국수 (2인)", price: 16000,
    area: "구룡포", address: "포항시 남구 구룡포읍 호미로 239-13",
    hours: CHECK, closed: "연중무휴 (확인 필요)",
    desc: "아귀 육수에 면을 끓여 내는 구룡포 향토 음식 모리국수 한 가지만 판다. 인원수대로 주문.",
    tags: ["향토 음식", "합석 가능"], sourceUrl: "https://polle.com/place/286kfB/" },
  { id: "pohang-9", region: "경북", city: "포항시", category: "snack", name: "할매 손칼국수", menu: "칼국수", price: 3000, priceLabel: "3,000원 (2016년 기사 기준)",
    area: "오천시장", address: "포항시 남구 오천읍 장기로1690번길 16-1",
    hours: CHECK, closed: CHECK,
    desc: "오천시장 안에서 2대째 이어 온 손칼국수집. 가격 정보가 오래되어 지금과 다를 수 있다.",
    tags: ["시장", "가성비"], sourceUrl: "https://www.imaeil.com/page/view/2016013000352279625" },
  { id: "pohang-10", region: "경북", city: "포항시", category: "snack", name: "엄마찐빵", menu: "찐빵 6개", price: 4000,
    area: "구룡포", address: "포항시 남구 구룡포읍",
    hours: CHECK, closed: CHECK,
    desc: "구룡포의 찐빵·도넛 가게. 도넛 2개 2,000원, 단팥죽도 있다.",
    tags: ["간식", "포장 가능"], sourceUrl: "https://hotplacehunter.co.kr/local/article/50382/" },

  // ---------------- 카페·디저트 ----------------
  { id: "pohang-11", region: "경북", city: "포항시", category: "cafe", name: "헤이안", menu: "소금빵 (2입)", price: 5800,
    area: "영일대 해안로", address: "포항시 북구 해안로 219",
    hours: CHECK, closed: CHECK,
    desc: "오션뷰 좌석과 테라스가 있는 대형 베이커리 카페. 헤이안롤 7,200원.",
    tags: ["바다 전망", "주차"], sourceUrl: "https://polle.com/place/1mkOsA/" },
  { id: "pohang-12", region: "경북", city: "포항시", category: "cafe", name: "팜테이블 영일대점", menu: "아메리카노", price: 4800,
    area: "영일대 해안로", address: "포항시 북구 해안로 211",
    hours: CHECK, closed: CHECK,
    desc: "영일대 앞 대형 카페. 수플레 팬케이크 같은 디저트 메뉴가 있다.",
    tags: ["바다 전망", "주차"], sourceUrl: "https://polle.com/place/2rYZWJ/" },
  { id: "pohang-13", region: "경북", city: "포항시", category: "cafe", name: "아라비카 커피 로스터스 영일대점", menu: "아메리카노", price: 5000,
    area: "영일대 해안로", address: "포항시 북구 해안로 185-1",
    hours: CHECK, closed: CHECK,
    desc: "원두를 골라 마시는 로스터리 카페. 2층 통창으로 바다가 보이고, 후추라떼(7,000원)가 대표 메뉴.",
    tags: ["바다 전망", "노트북 가능"], sourceUrl: "https://polle.com/place/1Zu1jS/" },
  { id: "pohang-14", region: "경북", city: "포항시", category: "cafe", name: "오브레멘", menu: "더블 에스프레소", price: 5800,
    area: "북구 해안로", address: "포항시 북구 해안로",
    hours: "10:00–22:30 (라스트오더 22:00)", closed: CHECK,
    desc: "늦게까지 여는 해안로 카페. 시그니처 음료 소금 수염(7,000원).",
    tags: ["늦게까지", "바다 근처"], sourceUrl: "https://hotplacehunter.co.kr/sns/article/88737/" },
];

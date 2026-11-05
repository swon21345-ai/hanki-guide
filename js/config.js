// =============================================================
//  config.js — 사이트 설정
//  Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹)에서 받은 값을 붙여 넣으세요.
//  apiKey가 "여기에"로 남아 있으면 '데모 모드'로 동작합니다.
//  (데모 모드: 입력 내용이 내 브라우저에만 저장되고, 메일 없이 바로 로그인)
// =============================================================
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDqi3jKL5B4xRk-F6KzRqPNWTHE2pUPB5k",
  authDomain: "hanki-guide.firebaseapp.com",
  projectId: "hanki-guide",
  storageBucket: "hanki-guide.firebasestorage.app",
  messagingSenderId: "442434069091",
  appId: "1:442434069091:web:060b80b0dc88f4d8098e56",
};

const SITE = {
  name: "한 끼 가이드",
  allowedEmail: /\.ac\.kr$/i,  // 대학 이메일만 허용 (필요하면 학교 도메인 추가)
  minRaters: 5,                // 이 인원 이상 채점해야 별이 붙음
  hankiPrice: 12000,           // '한 끼 추천' 배지 가격 기준
};

const DEMO_MODE = FIREBASE_CONFIG.apiKey.startsWith("여기에");

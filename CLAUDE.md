# 런치각 (LunchGAK) 프로젝트

## 앱 개요
직장인 점심·회식 맛집 추천 웹앱.
6단계 문답 → 카카오맵 기반 주변 식당 → Gemini AI 추천.

## 브랜드
- 앱명: 런치각 (영문: LunchGAK)
- 컬러: 네이비 #1B2A4A (primary), 골드 #C9A84C (accent), 크림 #F8F6F1 (bg)
- 톤: 친근하고 짧고 명쾌하게. 직장인 밈 활용.

## 기술 스택
- Frontend: React 18 + Vite + Tailwind CSS + React Router v6
- Backend: Firebase Functions (Node.js TypeScript) — asia-northeast3 (서울)
- DB/Auth: Firestore + Firebase Auth
- 지도: 카카오맵 JavaScript SDK (JS 키) + Local REST API (서버에서 호출)
- AI: Gemini 2.0 Flash (Firebase Functions에서 호출)
- 외부 API: 카카오 Local REST API, 네이버 검색 API, OpenWeather

## 폴더 구조
src/
  pages/ → Home.jsx, Quiz.jsx, Result.jsx
  components/ → QuizCard.jsx, RestaurantCard.jsx, KakaoMap.jsx
  hooks/ → useLocation.js, useRecommend.js
  context/ → QuizContext.jsx

## 환경변수 (.env)
VITE_FIREBASE_FUNCTIONS_URL=
VITE_KAKAO_JS_KEY=

## 핵심 규칙
- API 키는 절대 클라이언트에 노출 금지 → 모두 Firebase Functions 경유
- 카카오맵 렌더링은 JS SDK (클라이언트), 장소 검색은 REST API (서버)
- Tailwind 커스텀 컬러: primary=#1B2A4A, accent=#C9A84C, bg=#F8F6F1
- 모바일 우선 (max-w-sm mx-auto 기준)
- 컴포넌트 하나 수정 시 관련 파일 같이 확인할 것

## 문답 6단계
Q1 식사: 점심/저녁
Q2 자리: 혼밥/함께/회식
Q3 기분: 스트레스/피곤/기분좋음/평범/몸안좋음
Q4 음식: 매운/국물/면류/밥류/고기/가벼운/자유 (단일선택)
Q5 거리: 300m/600m/1000m
Q6 예산: 1만이하/1~2만/법카
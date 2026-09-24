# THREADFORM

디자인을 모르는 브랜드 창업 희망자를 위한 의류 디자인 스튜디오.
사업·가격·다음 작업 순서는 인수인계 문서를 따릅니다.

## 폴더 구조

```
public/        ← 사이트 화면 전체 (브라우저에 그대로 전달되는 파일)
  index.html     메인 스튜디오 (/)
  design/        새 디자인 창 (/design)
  onboarding/    온보딩 (/onboarding)
  config.js      시안·문구·가격 설정 (한 파일에 모음)
  vendor/        3D 표시용 라이브러리 (three.js r160)
  assets/        모델 사진 등 이미지 (아래 "빠진 파일" 참고)
api/           ← 서버 기능 (Vercel이 자동으로 서버 함수로 실행)
vercel.json    ← Vercel 설정 (주소에서 .html 생략 등)
```

## Vercel에 올리는 방법 (처음 한 번)

1. https://vercel.com 에 GitHub 계정으로 가입/로그인
2. **Add New… → Project** → 이 저장소(`qkrwodud818-prog/-`) 선택 → **Import**
3. 설정은 건드리지 말고 **Deploy** 클릭 (Framework Preset: Other)
4. 1분 정도 뒤 `https://○○○.vercel.app` 주소가 생깁니다

이후에는 GitHub에 코드가 올라갈 때마다 자동으로 다시 배포됩니다.

## 지금 서버 기능 상태

| 주소 | 상태 |
|---|---|
| `/api/photo-analysis` | 임시 — "준비 중"으로 응답 (다음 단계에서 구현) |
| `/api/notifications` | 임시 — "곧 열려요"로 응답 (DB 연결 후 구현) |
| `/api/public-config` | 동작 — 환경변수 `CLARITY_ID`가 있으면 방문 분석 켜짐 |

## 빠진 파일 (원본 사이트에서 받아 와야 함)

소스 묶음에 들어 있지 않았던 파일입니다. 사이트는 이 파일 없이도 열리지만 모양이 다릅니다.

- [ ] `public/studio.css` — 메인 스튜디오 화면 스타일. **지금은 임시 스타일**이 들어 있음
- [ ] `public/assets/model-woman.png`, `public/assets/model-man.png` — 온보딩·AI 룩북 모델 사진
- [ ] `public/onboarding/idea.svg`, `public/onboarding/label.svg` — 온보딩 장면 그림

대체로 넣은 것 (원본과 버전이 다를 수 있음):
- `public/vendor/three.module.js` — three.js r160 공식 배포본
- `public/design/pretendard.woff2` — Pretendard 가변 폰트 1.3.9 (OFL 라이선스)

## 내 컴퓨터에서 미리 보기 (선택)

Node.js 20 이상 설치 후:

```
npx vercel dev
```

// 임시 응답: 사진 AI 분석 서버는 다음 단계에서 구현합니다.
// 화면(design/photo-upload.js)은 code:'unavailable'을 받으면 "준비 중" 안내를 보여 줍니다.
export default function handler(req, res) {
  res.status(503).json({ code: 'unavailable' });
}

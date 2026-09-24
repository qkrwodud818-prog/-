// 임시 응답: "오픈 알림 신청" 저장은 데이터베이스(Supabase) 연결 후 구현합니다.
export default function handler(req, res) {
  res.status(503).json({ saved: false, error: '알림 신청은 곧 열려요. 조금만 기다려 주세요.' });
}

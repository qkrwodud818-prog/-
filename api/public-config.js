// 브라우저에 공개해도 되는 설정만 돌려줍니다. (비밀키는 절대 여기에 넣지 마세요)
// Vercel 환경변수 CLARITY_ID를 넣으면 Microsoft Clarity 방문 분석이 켜집니다.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json(process.env.CLARITY_ID ? { clarityId: process.env.CLARITY_ID } : {});
}

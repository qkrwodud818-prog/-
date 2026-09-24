import { techpackTables } from './techpack.js';
import { buildBrief, sanitizeDesign } from './model.js';
import { renderGarment } from './garment.js';
import {fontCss} from './workflows.js';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export function downloadBrief(input) {
  const design = sanitizeDesign(input);
  const preview = ['front', 'back', 'left', 'right', 'left', 'right'].map((view, i) => `<figure>${renderGarment(design, view, { surface:i>=4?'inner':'outer',idPrefix: `export-${i}`, technical: true, showMeasurements: view === 'front' || view === 'back' })}<figcaption>${['앞면', '뒷면', '왼쪽 소매 옆선', '오른쪽 소매 옆선','왼쪽 소매 안쪽선','오른쪽 소매 안쪽선'][i]}</figcaption></figure>`).join('');
  const html = `<!doctype html><html lang="ko"><meta charset="UTF-8"><title>${escape(design.name)} · 제작 의뢰서</title><style>body{font:14px/1.7 Pretendard,sans-serif;color:#222;max-width:1000px;margin:40px auto;padding:24px}header{border-bottom:2px solid #344a39;padding-bottom:20px}h1{font-size:28px}.views{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;text-align:center}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #ddd;padding:5px;text-align:left}h2{font-size:14px;margin-top:18px}.spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.caveat{font-size:9px;color:#666}.brief-details{margin-top:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;background:#f4f5f1;padding:24px}button{font-family:inherit;padding:12px 20px;cursor:pointer}small{color:#555}@media print{button{display:none}body{margin:0;padding:0}.views,header{break-inside:avoid}pre{background:white;font-size:11px}}</style><header><b>THREADFORM / DESIGN BRIEF</b><h1>${escape(design.name)}</h1><p>${escape(design.brand)} · ${new Date().toLocaleDateString('ko-KR')}</p><small>제작 상담용 디자인 초안입니다. 실제 패턴·원단·핏은 제작자와 샘플 검토가 필요합니다. 공장으로 전송되지 않았습니다.</small></header><p>스타일 ${escape(design.styleNumber)} · 시즌 ${escape(design.season)}</p><section class="views">${preview}</section>${techpackTables(design)}<details class="brief-details"><summary>전체 디자인 브리프</summary><pre>${escape(buildBrief(design))}</pre></details><button onclick="window.print()">인쇄 / PDF로 저장</button></html>`;
  const safeName = design.name.replace(/[\\/:*?"<>|]/g, '').slice(0,60) || 'design';
  downloadFile(html.replace('<style>','<style>'+fontCss()), `${safeName}-제작의뢰서.html`, 'text/html;charset=utf-8');
}

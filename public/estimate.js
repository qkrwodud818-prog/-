import { FABRICS, DETAILS } from './catalog.js';

// Dated observations, not live supplier quotations. Ranges below are our budget assumptions.
export const PRICE_RESEARCH = {
  checkedAt: '2026-09-20',
  sources: [
    {title:'+82FACTORY 2026 S/S 패턴·샘플 가격표',url:'https://plus82guide.koreanfriends.co.kr/doc/82gallery_price.pdf',checkedAt:'2026-09-20',observation:'반팔 패턴 40,000/샘플 20,000원, 긴팔 50,000/25,000원, 맨투맨 45,000/35,000원, 후드 55,000/55,000원. 원부자재 투입 이후 기준, 프린팅 별도.'},
    {title:'패션스타트 싱글 저지 소매 가격',url:'https://m.fashionstart.net/',checkedAt:'2026-09-20',observation:'20수 싱글 1y 정상가 7,200원, 표시 할인가 6,300원. 원단 폭·판매 단위 확인 필요.'},
    {title:'패션스타트 쭈리 원단 가격',url:'https://m.fashionstart.net/goods/goods_list.php?cateCd=005001',checkedAt:'2026-09-20',observation:'미니쭈리 8,000원/1y, 헤비쭈리 정상가 13,800원/1y. 할인·수급에 따라 변동.'},
    {title:'패션스타트 지퍼 소매 가격',url:'https://m.fashionstart.net/goods/goods_list.php?cateCd=011001',checkedAt:'2026-09-20',observation:'청바지용 20cm 지퍼 1,000원/개. 길이·브랜드별 단가 별도.'},
    {title:'세경실업 샘플 견적 조건',url:'https://www.sekyungapparel.com/services/sample',checkedAt:'2026-09-20',observation:'샘플비는 디자인 복잡도·원단에 따라 개별 견적. 일률적인 확정 공임으로 해석하지 않음.'},
  ],
};
const finite=(v,f,min,max)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):f;
const roundLow=n=>Math.floor(n/1000)*1000;
const roundHigh=n=>Math.ceil(n/1000)*1000;
const fabricRates={jersey:[7000,12000],jersey30:[7000,12000],'french-terry':[9000,16000],brushed:[11000,22000],'heavy-terry':[14000,24000],cable:[18000,45000],linen:[12000,35000],denim12:[12000,28000],denim8:[10000,25000],denimblack:[12000,28000],quilt:[15000,35000]};
const baseRates={tshirt:[40000,20000],longsleeve:[50000,25000],sweatshirt:[45000,35000],hoodie:[55000,55000]};

/** One first sample, excluding bulk order, VAT, shipping and subsequent revisions. Pure deterministic estimate. */
export function estimateSample(input={}) {
  const d=input&&typeof input==='object'?input:{},items=[];
  const add=(label,low,high,basis)=>items.push({label,low:roundLow(low),high:roundHigh(Math.max(low,high)),basis});
  const fabric=Object.hasOwn(FABRICS,d.fabric)?d.fabric:'french-terry';
  const length=finite(d.length,66,35,100),chest=finite(d.chest,64,32,95),sleeve=finite(d.sleeve,60,0,80);
  const hood=d.neckline==='hood'||['hoodie','ziphoodie','denimhoodie'].includes(d.type);
  const details=(Array.isArray(d.details)?d.details:[]).filter(x=>x&&Object.hasOwn(DETAILS,x.type)).slice(0,60);
  const graphics=[...(Array.isArray(d.graphics)?d.graphics:[]),...details.filter(x=>x.type==='armprint').flatMap(x=>Array.from({length:x.symmetric?2:1},()=>({...x,kind:'text'})))].filter(x=>x&&['text','image'].includes(x.kind)).slice(0,40);
  const units=x=>x.symmetric?2:1;
  // 150 cm cut width, two body panels + two sleeve panels, then cutting/waste allowance.
  const area=2*length*chest+2*sleeve*finite(d.bicep,25,12,42)+(hood?4200:0)+details.filter(x=>['patch','kangaroo','elbow'].includes(x.type)).reduce((n,x)=>n+800*units(x),0);
  const meters=Math.ceil(Math.max(.8,area/15000*1.3)*2)/2;
  const rates=fabricRates[fabric]|| (FABRICS[fabric].category==='기능성'?[10000,30000]:[9000,25000]);
  add(`원단 · ${FABRICS[fabric].label}`,meters*rates[0],(meters+.5)*rates[1],`앱 가정: 폭 150cm, 재단 여유 포함 약 ${meters}~${meters+.5}m. 참고 소매가격을 넓힌 m당 ${rates[0].toLocaleString('ko-KR')}~${rates[1].toLocaleString('ko-KR')}원 가정; 실제 마커·폭·수축 미확정.`);
  const base=baseRates[d.type],complex=['windbreaker','denimhoodie','trackjacket','ziphoodie'].includes(d.type);
  const pattern=base?.[0]??(complex?70000:50000),sewing=base?.[1]??(complex?65000:35000);
  add('기본 패턴 제작',pattern,pattern*(complex?2:1.6),base?'공개 +82FACTORY 해당 품목 패턴 가격을 하한 참고. 상한은 맞춤 수정 복잡도를 반영한 앱 가정.':'직접 일치하는 공개 단가 없음: 유사 품목에서 넓힌 앱 예산 가정.');
  add('샘플 재단·봉제 공임',sewing,sewing*(complex?2.2:1.8),base?'공개 +82FACTORY 샘플 공임 참고 + 맞춤 봉제 여유 가정. 원부자재·추가 디테일 별도.':'직접 일치하는 공개 단가 없음: 디자인별 샘플 봉제 공임 앱 가정.');
  const center=details.some(x=>['fullzip','halfzip','henley'].includes(x.type));
  const zips=details.filter(x=>/zip/.test(x.type)).reduce((n,x)=>n+units(x),0)+(!center&&(d.zipper||d.type==='halfzip')?1:0);
  if(zips)add(`지퍼 자재 · ${zips}개`,zips*1000,zips*10000,'20cm 지퍼 공개 소매가 1,000원 참고. 길이·금속·특수 슬라이더를 고려한 1,000~10,000원/개 앱 범위. 부착 공임은 디테일 항목.');
  const buttons=details.filter(x=>x.type==='henley').reduce((n,x)=>n+Math.round(finite(x.buttons,3,0,12))*units(x),0)+(!center&&['henley','polo','turtlehenley'].includes(d.type)?3:0);
  if(buttons)add(`단추 자재 · ${buttons}개`,buttons*300,buttons*2000,'앱 가정 300~2,000원/개. 버튼홀·부착은 추가 공임에 포함; 지정 부자재 별도 확인.');
  if(Number(d.hemRib)>0||Number(d.cuffRib)>0)add('시보리·기본 봉제 부자재',3000,12000,'앱 가정: 소량 구매 시보리·실·심지. 원단과 색상별 실제 단가 확인 필요.');
  const detailCount=details.reduce((n,x)=>n+units(x),0);
  if(detailCount)add(`추가 디테일 작업 · ${detailCount}곳`,details.reduce((n,x)=>n+(/zip|henley|polo/.test(x.type)?5000:3000)*units(x),0),details.reduce((n,x)=>n+(/zip|henley|polo/.test(x.type)?20000:12000)*units(x),0),'공개 확정 공임 아님: 위치별 패턴 수정·부착 3,000~20,000원 앱 가정. 스트링·라벨 등 소량 자재 포함.');
  for(const method of ['실크 프린트','DTF 전사','자수','와펜']){
    const count=graphics.filter(x=>(x.processing||'실크 프린트')===method).length;if(!count)continue;
    const [lo,hi]=method==='자수'?[15000,60000]:method==='실크 프린트'?[15000,50000]:method==='와펜'?[10000,35000]:[5000,20000];
    add(`${method} · ${count}개 그래픽`,count*lo,count*hi,'직접 일치하는 공개 단가 없음: 앱 가정. 제판·펀칭·면적·색상·최소 가공비에 따라 변동; 같은 위치 합판 가능 여부 미반영.');
  }
  if(d.fabricImage||d.pattern?.type==='image')add('사용자 원단·무늬 확인 예비비',10000,70000,'앱 가정. 업로드 이미지만으로 원단 조달·맞춤 날염 가능 여부를 알 수 없음. 실제 맞춤 날염은 별도 견적이며 이 범위를 초과할 수 있음.');
  return {low:items.reduce((n,x)=>n+x.low,0),high:items.reduce((n,x)=>n+x.high,0),currency:'KRW',items,sources:PRICE_RESEARCH.sources.map(x=>({...x})),disclaimer:'2026-09-20 공개 가격 조사와 앱 가정에 따른 샘플 1벌 예산 추정입니다. 실시간 검색·공장 확정 견적이 아닙니다. 부가세·배송·그레이딩·재샘플·양산 비용 제외. 원단 폭/수급·맞춤 날염·패턴 검토에 따라 범위를 초과할 수 있습니다. 승인해도 결제나 생산 발주가 발생하지 않습니다.',version:'sample-estimate-2026-09-20-v1'};
}

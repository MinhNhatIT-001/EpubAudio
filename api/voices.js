import { providerError } from '../server/eleven-errors.js';
import { elevenKey } from '../server/eleven-key.js';
import { vietnameseVoice } from '../server/vietnamese-voices.js';
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Phương thức không được hỗ trợ.'});
 const key=elevenKey(req);if(!key)return res.status(401).json({error:'Cần cấu hình ELEVENLABS_API_KEY trên Vercel hoặc nhập khóa cá nhân để tải kho giọng.'});
 const query=new URL(req.url,'http://localhost').searchParams;
 const page=Math.max(0,Math.min(1000,parseInt(query.get('page') || '0',10)||0));
 const params=new URLSearchParams({language:'vi',page_size:'30',page:String(page)});
 const search=query.get('search');if(search)params.set('search',search.slice(0,100));
 try {
 const response=await fetch('https://api.elevenlabs.io/v1/shared-voices?'+params,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(20000)});
 if(!response.ok)return res.status(response.status).json({error:await providerError(response,'voices')});
 const data=await response.json();return res.status(200).json({voices:(data.voices || []).map(vietnameseVoice).filter(Boolean),hasMore:Boolean(data.has_more),page});
 }catch{return res.status(502).json({error:'Không tải được kho giọng ElevenLabs. Hãy thử lại.'});}
}

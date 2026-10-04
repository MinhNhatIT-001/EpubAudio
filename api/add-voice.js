import { elevenKey } from '../server/eleven-key.js';
import { providerError } from '../server/eleven-errors.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Phương thức không được hỗ trợ.'});
 const key=elevenKey(req);if(!key)return res.status(401).json({error:'Hãy cấu hình khóa ElevenLabs.'});
 const {owner,voice,name}=req.body || {};if(![owner,voice].every(x=>typeof x==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(x)) || typeof name!=='string' || name.length>200)return res.status(400).json({error:'Giọng không hợp lệ.'});
 try{const headers={'xi-api-key':key,'Content-Type':'application/json'};
 const existing=await fetch('https://api.elevenlabs.io/v1/voices',{headers,signal:AbortSignal.timeout(15000)});
 if(!existing.ok)return res.status(existing.status).json({error:await providerError(existing,'voices')});
 const data=await existing.json();if(data.voices?.some(v=>v.voice_id===voice))return res.status(200).json({id:voice});
 const response=await fetch(`https://api.elevenlabs.io/v1/voices/add/${owner}/${voice}`,{method:'POST',headers,body:JSON.stringify({new_name:name}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)return res.status(response.status).json({error:await providerError(response,'add')});
 const added=await response.json();if(!added.voice_id)throw new Error();return res.status(200).json({id:added.voice_id});
 }catch{return res.status(502).json({error:'Không thêm được giọng. Hãy kiểm tra gói ElevenLabs và thử lại.'});}
}

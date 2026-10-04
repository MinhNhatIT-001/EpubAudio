export const isVietnamese = language => ['vi','vi-vn','vietnamese','tiếng việt'].includes(String(language || '').toLowerCase());
export function vietnameseVoice(v) {
 const verified=(v.verified_languages || []).find(x=>isVietnamese(x.language));
 if(!isVietnamese(v.language || v.labels?.language) && !verified)return null;
 return {id:v.voice_id,name:v.name,owner:v.public_owner_id || '',labels:{language:'Tiếng Việt',gender:({male:'Nam',female:'Nữ'})[v.gender || v.labels?.gender] || '',accent:verified?.accent || v.accent || v.labels?.accent || ''},preview:verified?.preview_url || (isVietnamese(v.language || v.labels?.language)?v.preview_url:null)};
}

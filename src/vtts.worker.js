import * as ort from 'onnxruntime-web/wasm';
import wasmUrl from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import { textToPhonemes, addBlanks } from './vendor/vtts-g2p.js';
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
const MODEL_BASE = 'https://raw.githubusercontent.com/tronghieuit/v-tts/e22eef3267869375e40a096b376cde94aa41e610/deployments/android/app/src/main/assets/';
let textEncoder, durationPredictor, flow, decoder, ttsConfig;
async function modelFile(name) {
  const url = MODEL_BASE + name;
  let cache; try { cache = await caches.open('epubaudio-vtts-e22eef3'); } catch {}
  let response = await cache?.match(url);
  if (!response) {
    response = await fetch(url);
    if (!response.ok) throw new Error(`Không tải được V-TTS (${response.status}). Hãy thử lại khi có mạng.`);
    try { await cache?.put(url, response.clone()); } catch { /* Storage may be full; inference still works. */ }
  }
  return response;
}
async function load(id) {
  if (ttsConfig && decoder) return;
  for (const [name, assign] of [
    ['text_encoder.onnx', v => textEncoder=v], ['duration_predictor.onnx',v=>durationPredictor=v],
    ['flow.onnx',v=>flow=v], ['decoder.onnx',v=>decoder=v]
  ]) {
    postMessage({id, status:`Đang tải mô hình V-TTS: ${name} · Lần đầu khoảng 173 MB`});
    const response = await modelFile(name);
    assign(await ort.InferenceSession.create(await response.arrayBuffer(), {executionProviders:['wasm']}));
  }
  ttsConfig = await (await modelFile('tts_config.json')).json();
}
async function infer(text, speakerId) {
  const {phonemes, tones, languages} = addBlanks(textToPhonemes(text, ttsConfig.symbol_to_id, ttsConfig.language_id_map.VI), ttsConfig.language_id_map.VI);
                const seqLen = phonemes.length;
                const phoneIds = new ort.Tensor('int64', new BigInt64Array(phonemes.map(BigInt)), [1, seqLen]);
                const phoneLengths = new ort.Tensor('int64', new BigInt64Array([BigInt(seqLen)]), [1]);
                const toneIds = new ort.Tensor('int64', new BigInt64Array(tones.map(BigInt)), [1, seqLen]);
                const languageIds = new ort.Tensor('int64', new BigInt64Array(languages.map(BigInt)), [1, seqLen]);
                const bert = new ort.Tensor('float32', new Float32Array(1024 * seqLen), [1, 1024, seqLen]);
                const jaBert = new ort.Tensor('float32', new Float32Array(768 * seqLen), [1, 768, seqLen]);
                const sid = new ort.Tensor('int64', new BigInt64Array([BigInt(speakerId)]), [1]);

                // Step 2: Text encoder

                const encOutputs = await textEncoder.run({
                    phone_ids: phoneIds,
                    phone_lengths: phoneLengths,
                    tone_ids: toneIds,
                    language_ids: languageIds,
                    bert: bert,
                    ja_bert: jaBert,
                    speaker_id: sid
                });

                const xEncoded = encOutputs.x_encoded;
                const mP = encOutputs.m_p;
                const logsP = encOutputs.logs_p;
                const xMask = encOutputs.x_mask;
                const g = encOutputs.g;

                

                // Step 3: Duration prediction

                const dpOutputs = await durationPredictor.run({
                    x: xEncoded,
                    x_mask: xMask,
                    g: g
                });

                const logw = dpOutputs.logw;

                // Compute durations and expand
                const logwData = logw.data;
                const maskData = xMask.data;
                let totalFrames = 0;
                const durations = [];

                for (let i = 0; i < logwData.length; i++) {
                    const dur = Math.ceil(Math.exp(logwData[i]) * maskData[i]);
                    durations.push(dur);
                    totalFrames += dur;
                }

                

                if (!Number.isFinite(totalFrames) || totalFrames < 1 || totalFrames > 12000) throw new Error('Đoạn văn quá dài để tạo audio.');
                // Expand m_p and logs_p according to durations
                const mPData = mP.data;
                const logsPData = logsP.data;
                const channels = mP.dims[1];

                const expandedMP = new Float32Array(channels * totalFrames);
                const expandedLogsP = new Float32Array(channels * totalFrames);

                let frameIdx = 0;
                for (let t = 0; t < durations.length; t++) {
                    for (let d = 0; d < durations[t]; d++) {
                        for (let c = 0; c < channels; c++) {
                            expandedMP[c * totalFrames + frameIdx] = mPData[c * seqLen + t];
                            expandedLogsP[c * totalFrames + frameIdx] = logsPData[c * seqLen + t];
                        }
                        frameIdx++;
                    }
                }

                // Sample z_p
                const zP = new Float32Array(channels * totalFrames);
                for (let i = 0; i < zP.length; i++) {
                    const noise = (Math.random() * 2 - 1) * 0.667;
                    zP[i] = expandedMP[i] + Math.exp(expandedLogsP[i]) * noise;
                }

                const zPTensor = new ort.Tensor('float32', zP, [1, channels, totalFrames]);
                const yMask = new ort.Tensor('float32', new Float32Array(totalFrames).fill(1), [1, 1, totalFrames]);

                // Step 4: Flow reverse

                const flowOutputs = await flow.run({
                    z_p: zPTensor,
                    y_mask: yMask,
                    g: g
                });

                const z = flowOutputs.z;

                // Apply mask
                const zData = z.data;
                const zMasked = new Float32Array(zData.length);
                for (let i = 0; i < zData.length; i++) {
                    zMasked[i] = zData[i]; // mask is all 1s
                }

                const zTensor = new ort.Tensor('float32', zMasked, z.dims);

                // Decode to audio
                const decOutputs = await decoder.run({
                    z: zTensor,
                    g: g
                });

                const audio = decOutputs.audio;
                


  const result = new Float32Array(audio.data);
  // Release intermediate tensors after each phrase to keep long books bounded.
  for (const values of [encOutputs, dpOutputs, flowOutputs, decOutputs]) for(const tensor of Object.values(values)) tensor.dispose();
  for(const tensor of [phoneIds,phoneLengths,toneIds,languageIds,bert,jaBert,sid,zPTensor,yMask,zTensor]) tensor.dispose();
  return result;
}
self.onmessage = async ({data:{id,parts,speaker}}) => {
  try {
    if (!['SF','NF'].includes(speaker)) throw new Error('Chỉ hỗ trợ giọng nữ tiếng Việt.');
    await load(id);
    const chunks=[], cues=[]; let length=0;
    for(let i=0;i<parts.length;i++) {
      postMessage({id,status:`Đang tạo audio · ${i+1}/${parts.length} cụm`});
      const samples=await infer(parts[i].text, ttsConfig.speakers[speaker]);
      cues.push({start:length/ttsConfig.sample_rate,offset:parts[i].start});
      chunks.push(samples); length+=samples.length;
      const pause=new Float32Array(Math.round(ttsConfig.sample_rate * (/[.!?…]$/.test(parts[i].text)?0.3:0.12)));
      chunks.push(pause);length+=pause.length;
    }
    const samples=new Float32Array(length); let offset=0;
    for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length;}
    postMessage({id,samples,cues,sampleRate:ttsConfig.sample_rate},[samples.buffer]);
  } catch(error) { postMessage({id,error:error.message}); }
};

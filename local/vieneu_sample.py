"""Create a real Vietnamese audio sample with an isolated local VieNeu install."""
from pathlib import Path
import os
import json
import time
import shutil
from vieneu import Vieneu

output = Path(__file__).resolve().parents[1] / '.local' / 'vieneu'
output.mkdir(parents=True, exist_ok=True)
os.environ.setdefault('HF_HOME', str(output.parent / 'vieneu-cache'))
from huggingface_hub import hf_hub_download

# ONNX validates external tensor files against the graph directory. HF cache
# symlinks can point into separate blob directories, so copy only our downloaded
# graph artifacts into their snapshot directory before the inference engine loads.
def materialize(repo, names, subfolder=None):
    for name in names:
        cached=Path(hf_hub_download(repo, name, subfolder=subfolder))
        if cached.is_symlink():
            temporary=cached.with_name(cached.name+'.materializing')
            shutil.copyfile(cached.resolve(), temporary)
            temporary.replace(cached)

materialize('OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX', [
    'moss_audio_tokenizer_decode_full.onnx','moss_audio_tokenizer_decode_shared.data',
    'moss_audio_tokenizer_decode_step.onnx','codec_browser_onnx_meta.json',
    'moss_audio_tokenizer_encode.onnx','moss_audio_tokenizer_encode.data'])
if not os.environ.get('VIENEU_ONNX_DIR'):
    materialize('pnnbao-ump/VieNeu-TTS-v3-Turbo', [
        'vieneu_prefill.onnx','vieneu_decode_step.onnx','vieneu_acoustic_cached.onnx',
        'vieneu_backbone_shared.data','vieneu_v3_heads.npz','config.json','tokenizer.json'], 'onnx_update')
started = time.monotonic()
options={'backend':'onnx','threads':4}
if os.environ.get('VIENEU_ONNX_DIR'): options['onnx_dir']=os.environ['VIENEU_ONNX_DIR']
tts = Vieneu(**options)
print('MODEL_READY', flush=True)
voices = tts.list_preset_voices()
print(json.dumps({'voices': voices}, ensure_ascii=False), flush=True)
text = 'Xin chào. Đây là giọng đọc tiếng Việt chạy trên máy của bạn. Nhấp đúp vào một cụm từ trong sách để bắt đầu nghe từ đó.'
audio = tts.infer(text)
path = output / 'nghe-thu.wav'
tts.save(audio, str(path))
print(json.dumps({'audio': str(path), 'seconds': len(audio) / 48000, 'elapsed': round(time.monotonic() - started, 2)}, ensure_ascii=False), flush=True)

"""Tries several continuations for the walkthrough half of the music bed and scores them.

Keeps pass A (the first 26 s of bed-raw.wav), continues it with several seeds, and prints for each:
the new part's loudness against A's body, and how closely its pitch-class profile matches A's (same key).
The best one is written as bed-raw.wav (the original is kept as bed-raw-a.wav).

    PYTHONPATH=C:/Users/Public/redhill-musicgen/site py -3.9 music_b.py --seeds 1,2,3,4,5,6
"""
import argparse
import os
import shutil

import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

parser = argparse.ArgumentParser()
parser.add_argument("--model", default="facebook/musicgen-medium")
parser.add_argument("--seeds", default="1,2,3,4,5,6")
parser.add_argument("--dir", default="../assets/music")
args = parser.parse_args()

B_PROMPT = (
    "felt piano melody blooms into a full warm arrangement: lush strings, soft pads and gentle cello, "
    "swelling and opening up, uplifting, emotional, rich and full, slow 72 bpm, major key, no drums, no vocals"
)
A_SECONDS = 26.0
CONTEXT_SECONDS = 8.0
NEW_SECONDS = 20.0

raw = os.path.join(args.dir, "bed-raw.wav")
a_path = os.path.join(args.dir, "bed-raw-a.wav")
if not os.path.exists(a_path):
    shutil.copy(raw, a_path)
full, rate = sf.read(a_path, dtype="float32")
a = full[: int(A_SECONDS * rate)]

device = "cuda"
processor = AutoProcessor.from_pretrained(args.model)
model = MusicgenForConditionalGeneration.from_pretrained(args.model, torch_dtype=torch.float16).to(device)
frame_rate = model.config.audio_encoder.frame_rate


def db(x):
    return 20 * np.log10(np.sqrt(np.mean(x**2)) + 1e-9)


def chroma(x):
    """12-bin pitch-class energy over the whole clip (a crude key fingerprint)."""
    n = 8192
    hop = 4096
    win = np.hanning(n)
    freqs = np.fft.rfftfreq(n, 1 / rate)
    valid = (freqs > 55) & (freqs < 2000)
    pcs = (np.round(12 * np.log2(freqs[valid] / 440.0)) % 12).astype(int)
    c = np.zeros(12)
    for i in range(0, len(x) - n, hop):
        mag = np.abs(np.fft.rfft(x[i : i + n] * win))[valid]
        np.add.at(c, pcs, mag)
    return c / (np.linalg.norm(c) + 1e-9)


a_body_db = db(a[int(4 * rate) : int(22 * rate)])
a_chroma = chroma(a)
context = a[-int(CONTEXT_SECONDS * rate) :]
best = None
for seed in [int(s) for s in args.seeds.split(",")]:
    torch.manual_seed(seed)
    inputs = processor(text=[B_PROMPT], audio=context, sampling_rate=rate, padding=True, return_tensors="pt")
    inputs = {k: (v.to(device, torch.float16) if v.dtype.is_floating_point else v.to(device)) for k, v in inputs.items()}
    with torch.no_grad():
        out = model.generate(**inputs, do_sample=True, guidance_scale=3.5, max_new_tokens=int(NEW_SECONDS * frame_rate) + 4)
    b = out[0, 0].float().cpu().numpy()[len(context) :]
    b = b[: int(NEW_SECONDS * rate)]
    sf.write(os.path.join(args.dir, f"cand-b-{seed}.wav"), b, rate)
    lift = db(b[int(2 * rate) : int(16 * rate)]) - a_body_db
    key = float(np.dot(chroma(b), a_chroma))
    # Want it at least as loud as A's body (it opens up) and in the same key.
    score = key * 10 + min(lift, 4)
    print(f"seed {seed}: lift {lift:+.1f} dB, key match {key:.3f}, score {score:.2f}")
    if best is None or score > best[0]:
        best = (score, seed, b)

score, seed, b = best
bed = np.concatenate([a, b])
bed = bed / (np.max(np.abs(bed)) or 1.0) * 0.89
sf.write(raw, bed, rate)
print(f"chose seed {seed} (score {score:.2f}); wrote {raw}: {len(bed) / rate:.2f} s")

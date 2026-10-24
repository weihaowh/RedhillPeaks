"""Generates the film's music bed locally with MusicGen, in two connected passes.

Pass A is the quiet first part (paper plan -> renovation -> styling -> dusk), 26 s.
Pass B continues from A's last 10 s, so key and tempo carry over, and opens up for the walkthrough
(which starts at film 26.0 s). The result is A + B's new audio, written as one WAV.

    PYTHONPATH=C:/Users/Public/redhill-musicgen/site py -3.9 music.py [--seed N] [--model facebook/musicgen-medium]

(torch 2.5.1+cu121, transformers 4.46.3, soundfile, numpy 1.26 installed there with pip --target.)
"""
import argparse

import numpy as np
import soundfile as sf
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

parser = argparse.ArgumentParser()
parser.add_argument("--model", default="facebook/musicgen-medium")
parser.add_argument("--seed", type=int, default=7)
parser.add_argument("--out", default="../assets/music/bed-raw.wav")
args = parser.parse_args()

A_PROMPT = (
    "soft felt piano solo, intimate and warm, sparse gentle melody, close-miked muted piano, "
    "slow 72 bpm, major key, calm hopeful home, no drums, no vocals, clean studio recording"
)
B_PROMPT = (
    "soft felt piano melody joined by warm sustained strings and a soft pad, opening up, fuller and brighter, "
    "gentle swell, hopeful and tender, slow 72 bpm, major key, no drums, no vocals, clean studio recording"
)
A_SECONDS = 26.0
B_TOTAL_SECONDS = 29.5  # includes the 10 s of A it continues from
CONTEXT_SECONDS = 10.0

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32
processor = AutoProcessor.from_pretrained(args.model)
model = MusicgenForConditionalGeneration.from_pretrained(args.model, torch_dtype=dtype).to(device)
rate = model.config.audio_encoder.sampling_rate
frame_rate = model.config.audio_encoder.frame_rate  # tokens per second


def generate(text, seconds, audio=None):
    torch.manual_seed(args.seed)
    inputs = processor(text=[text], audio=audio, sampling_rate=rate, padding=True, return_tensors="pt")
    inputs = {k: (v.to(device, dtype) if v.dtype.is_floating_point else v.to(device)) for k, v in inputs.items()}
    new = seconds - (len(audio) / rate if audio is not None else 0)
    with torch.no_grad():
        out = model.generate(**inputs, do_sample=True, guidance_scale=3.0, max_new_tokens=int(new * frame_rate) + 4)
    return out[0, 0].float().cpu().numpy()


a = generate(A_PROMPT, A_SECONDS)[: int(A_SECONDS * rate)]
print(f"A: {len(a) / rate:.2f} s")
context = a[-int(CONTEXT_SECONDS * rate):]
b = generate(B_PROMPT, B_TOTAL_SECONDS, audio=context)
# The continuation returns the context followed by the new audio; keep only what is new.
b_new = b[len(context):]
print(f"B new: {len(b_new) / rate:.2f} s")
bed = np.concatenate([a, b_new])
peak = np.max(np.abs(bed)) or 1.0
bed = bed / peak * 0.89  # about -1 dBFS; loudness is set in the mix
sf.write(args.out, bed, rate)
print(f"wrote {args.out}: {len(bed) / rate:.2f} s at {rate} Hz, seed {args.seed}")

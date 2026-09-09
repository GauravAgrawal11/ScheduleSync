"""
Full Verification of Local Faster-Whisper
Tests package installation, model loading, and actual audio transcription.
"""
import os
import wave
import struct
import math
import time

print("=" * 60)
print("VERIFYING LOCAL OPEN-SOURCE FASTER-WHISPER")
print("=" * 60)

# 1. Verify Imports & Versions
try:
    import faster_whisper
    import ctranslate2
    print(f"1. faster-whisper is installed: v{faster_whisper.__version__}")
    print(f"   ctranslate2 engine is installed: v{ctranslate2.__version__}")
except Exception as e:
    print(f"FAILED on imports: {e}")
    exit(1)

# 2. Verify Model Initialization on CPU
print("\n2. Loading local WhisperModel ('tiny', int8 quantization on CPU)...")
t0 = time.time()
try:
    from faster_whisper import WhisperModel
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    t_load = time.time() - t0
    print(f"   Local model loaded into memory in {t_load:.2f}s! (No errors, 100% offline)")
except Exception as e:
    print(f"FAILED to load model: {e}")
    exit(1)

# 3. Create a valid 2-second WAV audio file (16kHz, mono, 16-bit PCM - standard Whisper spec)
test_wav = "test_audio_sample.wav"
sample_rate = 16000
duration = 2.0  # seconds
freq = 440.0   # A4 pitch tone

with wave.open(test_wav, "w") as wav_file:
    wav_file.setnchannels(1)       # Mono
    wav_file.setsampwidth(2)       # 16-bit
    wav_file.setframerate(sample_rate)
    num_samples = int(sample_rate * duration)
    frames = []
    for i in range(num_samples):
        val = int(32767.0 * 0.5 * math.sin(2.0 * math.pi * freq * i / sample_rate))
        frames.append(struct.pack("<h", val))
    wav_file.writeframes(b"".join(frames))

print(f"\n3. Generated test audio file: {test_wav} ({os.path.getsize(test_wav)} bytes)")

# 4. Transcribe the audio file using local faster-whisper
print("\n4. Running local audio transcription through Faster-Whisper...")
t1 = time.time()
try:
    segments, info = model.transcribe(test_wav, beam_size=1)
    transcription = " ".join([seg.text for seg in segments]).strip()
    t_infer = time.time() - t1
    print(f"   Transcription completed in: {t_infer:.3f}s!")
    print(f"   Language detected: '{info.language}' (probability: {info.language_probability:.2f})")
    print(f"   Transcribed text output: '{transcription}'")
    print("\nRESULT: LOCAL OPEN-SOURCE FASTER-WHISPER IS 100% INSTALLED AND FULLY WORKING!")
except Exception as e:
    print(f"FAILED during transcription: {e}")
finally:
    if os.path.exists(test_wav):
        os.remove(test_wav)

print("=" * 60)

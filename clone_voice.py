import os
import torch
import numpy as np
from pydub import AudioSegment
from tortoise.api import TextToSpeech
from tortoise.utils.audio import load_audio
import soundfile as sf

# Add GPU diagnostics
print("=== GPU DIAGNOSTICS ===")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")
print("======================")

# Set the specific file path
input_file = r"C:\Users\rt\projects\goggins\assets\goggin_iso.mp3"
output_dir = "voice_samples"
text = "This is a test of my cloned voice using Tortoise TTS."

# Create output directory
os.makedirs(output_dir, exist_ok=True)

# Step 1: Load and process audio file
print(f"Loading audio file: {input_file}")
try:
    long_audio = AudioSegment.from_file(input_file)
    print(f"Loaded {len(long_audio)/1000:.2f} seconds of audio")
except Exception as e:
    print(f"Error loading audio: {e}")
    print("Make sure the file exists and is in a supported format")
    exit(1)

# Parameters for splitting
segment_length_ms = 15000  # 15 seconds per segment
min_segment_length_ms = 5000  # Minimum 5 seconds per segment

# Split into chunks
chunks = []
for i in range(0, len(long_audio), segment_length_ms):
    chunk = long_audio[i:i+segment_length_ms]
    # Only keep chunks that are long enough
    if len(chunk) >= min_segment_length_ms:
        chunks.append(chunk)

# Save the segments
print(f"Saving {len(chunks)} audio segments...")
for i, segment in enumerate(chunks):
    # Normalize audio level
    normalized = segment.normalize()
    # Export as WAV
    filename = f"{output_dir}/segment_{i:03d}.wav"
    normalized.export(filename, format="wav")
    print(f"Saved: {filename} ({len(normalized)/1000:.2f} seconds)")

print(f"\nFinished! {len(chunks)} voice samples saved to the '{output_dir}' folder.")

# Step 2: Generate speech with Tortoise TTS
print("\n--- VOICE CLONING WITH TORTOISE TTS ---")
print(f"Initializing Tortoise TTS...")

# Force CUDA usage if available
if torch.cuda.is_available():
    device = "cuda"
    torch.cuda.set_device(0)
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    device = "cpu"
    print("No GPU available, using CPU")

# Initialize TTS with forced device
tts = TextToSpeech(device=device)

# Load voice samples directly from the directory
print(f"Loading voice samples from {output_dir}...")
voice_samples = []
for file in os.listdir(output_dir):
    if file.endswith(".wav"):
        full_path = os.path.join(output_dir, file)
        audio = load_audio(full_path, 24000)
        voice_samples.append(audio)

# Generate speech
print(f"Text: {text}")
try:
    # Try with 'fast' preset first for GPU acceleration
    print("Trying fast preset for GPU acceleration...")
    gen_audio = tts.tts_with_preset(
        text=text,
        voice_samples=voice_samples,
        preset="fast"
    )
except Exception as e:
    print(f"Fast preset failed: {e}")
    print("Trying default approach...")
    try:
        # Fall back to default
        gen_audio = tts.tts(
            text=text,
            voice_samples=voice_samples
        )
    except Exception as e2:
        print(f"Default approach failed: {e2}")
        print("Trying one more approach...")
        # Try to call tts method with different parameter combinations
        try:
            gen_audio = tts.tts(
                text=text,
                voice_samples=voice_samples,
                k=1,
                use_deterministic_seed=True
            )
        except Exception as e3:
            print(f"All attempts failed. Error: {e3}")
            print("Please check Tortoise TTS documentation for your specific version.")
            exit(1)

# Save the generated audio (using soundfile instead of save_wav)
output_file = "cloned_voice_output.wav"
sf.write(output_file, gen_audio.cpu().numpy(), 24000)
print(f"Generated speech saved to {output_file}")

print("\nVoice cloning complete!")

# Create a simple script for generating more speech with this voice
with open("generate_speech.py", "w") as f:
    f.write("""
import os
import argparse
import torch
import soundfile as sf
from tortoise.api import TextToSpeech
from tortoise.utils.audio import load_audio

# Add GPU diagnostics
print("=== GPU DIAGNOSTICS ===")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")
print("======================")

parser = argparse.ArgumentParser(description="Generate speech with cloned voice")
parser.add_argument("--voice_dir", type=str, default="voice_samples", help="Directory with voice samples")
parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
parser.add_argument("--output", type=str, default="output.wav", help="Output file")
parser.add_argument("--preset", type=str, default="fast", help="Generation preset (fast, standard, high_quality)")
args = parser.parse_args()

# Force CUDA usage if available
if torch.cuda.is_available():
    device = "cuda"
    torch.cuda.set_device(0)
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    device = "cpu"
    print("No GPU available, using CPU")

# Initialize TTS
tts = TextToSpeech(device=device)

# Load voice samples
print(f"Loading voice from {args.voice_dir}...")
voice_samples = []
for file in os.listdir(args.voice_dir):
    if file.endswith(".wav"):
        full_path = os.path.join(args.voice_dir, file)
        audio = load_audio(full_path, 24000)
        voice_samples.append(audio)

# Generate speech
print(f"Text: {args.text}")
try:
    # Try with specified preset first
    print(f"Generating with {args.preset} preset...")
    gen_audio = tts.tts_with_preset(
        text=args.text,
        voice_samples=voice_samples,
        preset=args.preset
    )
except Exception as e:
    print(f"Preset {args.preset} failed: {e}")
    print("Trying default approach...")
    try:
        # Fall back to default
        gen_audio = tts.tts(
            text=args.text,
            voice_samples=voice_samples
        )
    except Exception as e2:
        print(f"Default approach failed: {e2}")
        print("Trying simpler approach...")
        try:
            gen_audio = tts.tts(
                text=args.text,
                voice_samples=voice_samples,
                k=1,
                use_deterministic_seed=True
            )
        except Exception as e3:
            print(f"All attempts failed. Error: {e3}")
            exit(1)

# Save the generated audio
sf.write(args.output, gen_audio.cpu().numpy(), 24000)
print(f"Generated speech saved to {args.output}")
""")
print("Sample generation script saved to generate_speech.py")
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
text = "This is a test of my cloned voice using Tortoise TTS at the highest quality settings."

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

# Parameters for splitting - use longer segments for better quality
segment_length_ms = 20000  # 20 seconds per segment
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
    # Export as WAV with higher quality
    filename = f"{output_dir}/segment_{i:03d}.wav"
    normalized.export(filename, format="wav")
    print(f"Saved: {filename} ({len(normalized)/1000:.2f} seconds)")

print(f"\nFinished! {len(chunks)} voice samples saved to the '{output_dir}' folder.")

# Step 2: Generate speech with Tortoise TTS
print("\n--- HIGH QUALITY VOICE CLONING WITH TORTOISE TTS ---")
print(f"Initializing Tortoise TTS...")

# Force CUDA usage if available
if torch.cuda.is_available():
    device = "cuda"
    torch.cuda.set_device(0)
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    device = "cpu"
    print("No GPU available, using CPU (this will be very slow for high quality)")

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

print(f"Loaded {len(voice_samples)} voice samples")

# Generate speech with highest quality settings
print(f"Text: {text}")
print(f"Generating with HIGH QUALITY settings (this may take several minutes)...")

try:
    # Use the high_quality preset with compatible parameters
    gen_audio = tts.tts_with_preset(
        text=text,
        voice_samples=voice_samples,
        preset="high_quality"
    )
except Exception as e:
    print(f"High quality preset failed: {e}")
    print("Falling back to standard approach with high quality...")
    try:
        # Fall back to manual configuration with compatible parameters
        gen_audio = tts.tts(
            text=text,
            voice_samples=voice_samples,
            k=6,  # Higher k value for better quality (up to 6)
            diffusion_iterations=200,  # Increased iterations
            num_autoregressive_samples=256,  # Increased sampling
            temperature=0.8,
            length_penalty=1.0,
            repetition_penalty=2.0,
            top_p=0.8
        )
    except Exception as e2:
        print(f"Standard approach failed: {e2}")
        print("Falling back to minimal high quality settings...")
        try:
            gen_audio = tts.tts(
                text=text,
                voice_samples=voice_samples,
                k=4,
                num_autoregressive_samples=128
            )
        except Exception as e3:
            print(f"Trying basic approach...")
            try:
                gen_audio = tts.tts(
                    text=text,
                    voice_samples=voice_samples
                )
            except Exception as e4:
                print(f"All attempts failed. Error: {e4}")
                print("Please check Tortoise TTS documentation for your specific version.")
                exit(1)

# Check the shape of the generated audio
print(f"Generated audio shape: {gen_audio.shape}")

# Handle different possible shapes
if len(gen_audio.shape) == 3:
    # If shape is [1, 1, samples], reshape to [samples]
    gen_audio_np = gen_audio.squeeze().cpu().numpy()
elif len(gen_audio.shape) == 2:
    # If shape is [1, samples], reshape to [samples]
    gen_audio_np = gen_audio.squeeze(0).cpu().numpy()
else:
    # Already in the right shape
    gen_audio_np = gen_audio.cpu().numpy()

print(f"Reshaped audio shape: {gen_audio_np.shape}")

# Save the generated audio with high quality
output_file = "high_quality_voice.wav"
sf.write(output_file, gen_audio_np, 24000)
print(f"Generated high quality speech saved to {output_file}")

print("\nHigh quality voice cloning complete!")

# Create a script for generating more high quality speech with this voice
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

parser = argparse.ArgumentParser(description="Generate high quality speech with cloned voice")
parser.add_argument("--voice_dir", type=str, default="voice_samples", help="Directory with voice samples")
parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
parser.add_argument("--output", type=str, default="high_quality_output.wav", help="Output file")
parser.add_argument("--quality", type=str, default="high", choices=["high", "medium", "fast"], help="Quality preset")
args = parser.parse_args()

# Force CUDA usage if available
if torch.cuda.is_available():
    device = "cuda"
    torch.cuda.set_device(0)
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    device = "cpu"
    print("No GPU available, using CPU - this will be VERY slow for high quality")

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

print(f"Loaded {len(voice_samples)} voice samples")

# Generate speech with quality settings based on user choice
print(f"Text: {args.text}")

# Choose preset based on quality argument
preset = "high_quality" if args.quality == "high" else "standard" if args.quality == "medium" else "fast"
print(f"Generating speech with {preset} preset...")

try:
    # Use preset
    gen_audio = tts.tts_with_preset(
        text=args.text,
        voice_samples=voice_samples,
        preset=preset
    )
except Exception as e:
    print(f"Preset {preset} failed: {e}")
    print("Falling back to manual configuration...")
    
    # Set parameters based on quality level
    if args.quality == "high":
        k_val = 6
        diffusion_iter = 200
        ar_samples = 256
    elif args.quality == "medium":
        k_val = 4
        diffusion_iter = 100
        ar_samples = 128
    else:  # fast
        k_val = 2
        diffusion_iter = 50
        ar_samples = 64
    
    try:
        gen_audio = tts.tts(
            text=args.text,
            voice_samples=voice_samples,
            k=k_val,
            diffusion_iterations=diffusion_iter,
            num_autoregressive_samples=ar_samples
        )
    except Exception as e2:
        print(f"Manual configuration failed: {e2}")
        print("Trying basic approach...")
        try:
            gen_audio = tts.tts(
                text=args.text,
                voice_samples=voice_samples
            )
        except Exception as e3:
            print(f"All attempts failed. Error: {e3}")
            exit(1)

# Handle different possible shapes
print(f"Generated audio shape: {gen_audio.shape}")
if len(gen_audio.shape) == 3:
    gen_audio_np = gen_audio.squeeze().cpu().numpy()
elif len(gen_audio.shape) == 2:
    gen_audio_np = gen_audio.squeeze(0).cpu().numpy()
else:
    gen_audio_np = gen_audio.cpu().numpy()
print(f"Reshaped audio shape: {gen_audio_np.shape}")

# Save the generated audio
sf.write(args.output, gen_audio_np, 24000)
print(f"Generated speech saved to {args.output}")

print("\\nTips for best results:")
print("1. For longer texts, split into natural paragraphs")
print("2. Add punctuation for better phrasing and pauses")
print("3. Run on a system with a good GPU for faster generation")
print("4. Try different quality settings if you encounter issues")
""")
print("Speech generation script saved to generate_speech.py")
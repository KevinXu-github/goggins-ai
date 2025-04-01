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

# Define output directory
OUTPUT_DIR = os.path.join(os.getcwd(), "output")

# Create output directory if it doesn't exist
if not os.path.exists(OUTPUT_DIR):
    print(f"Creating output directory: {OUTPUT_DIR}")
    os.makedirs(OUTPUT_DIR)
else:
    print(f"Output directory exists: {OUTPUT_DIR}")

parser = argparse.ArgumentParser(description="Generate high quality speech with cloned voice")
parser.add_argument("--voice_dir", type=str, default="voice_samples", help="Directory with voice samples")
parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
parser.add_argument("--output", type=str, default="speech_output.wav", help="Output filename (will be saved in output folder)")
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

# Create full output path in the output directory
output_file_path = os.path.join(OUTPUT_DIR, args.output)

# Save the generated audio
sf.write(output_file_path, gen_audio_np, 24000)
print(f"Generated speech saved to {output_file_path}")

print("\nTips for best results:")
print("1. For longer texts, split into natural paragraphs")
print("2. Add punctuation for better phrasing and pauses")
print("3. Run on a system with a good GPU for faster generation")
print("4. Try different quality settings if you encounter issues")
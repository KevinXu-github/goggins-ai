import os
import argparse
import torch
import soundfile as sf
import sys

# Suppress warnings
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

def main():
    try:
        print("=== TORTOISE-TTS SPEECH GENERATION ===")
        
        parser = argparse.ArgumentParser(description="Generate high quality speech with cloned voice")
        parser.add_argument("--voice_dir", type=str, default="voice_samples", help="Directory with voice samples")
        parser.add_argument("--text", type=str, required=True, help="Text to synthesize")
        parser.add_argument("--output", type=str, default="speech_output.wav", help="Output filename")
        parser.add_argument("--quality", type=str, default="fast", choices=["fast", "medium", "high"], help="Quality preset")
        args = parser.parse_args()

        print(f"Text: {args.text[:50]}{'...' if len(args.text) > 50 else ''}")
        print(f"Quality: {args.quality}")
        print(f"Voice samples dir: {args.voice_dir}")
        
        # Check if voice samples directory exists
        if not os.path.exists(args.voice_dir):
            print(f"ERROR: Voice samples directory not found: {args.voice_dir}")
            print("Please run clone_voice.py first to create voice samples")
            return 1
        
        # Check if there are any .wav files in the voice samples directory
        wav_files = [f for f in os.listdir(args.voice_dir) if f.endswith('.wav')]
        if not wav_files:
            print(f"ERROR: No .wav files found in {args.voice_dir}")
            print("Please run clone_voice.py first to create voice samples")
            return 1
        
        print(f"Found {len(wav_files)} voice sample files")

        # Import Tortoise-TTS (only after we've checked prerequisites)
        try:
            from tortoise.api import TextToSpeech
            from tortoise.utils.audio import load_audio
        except ImportError as e:
            print(f"ERROR: Failed to import Tortoise-TTS: {e}")
            print("Please install Tortoise-TTS: pip install tortoise-tts")
            return 1

        # Configure device
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {device}")
        if device == "cuda":
            print(f"GPU: {torch.cuda.get_device_name(0)}")

        # Initialize TTS
        print("Initializing Tortoise-TTS...")
        tts = TextToSpeech(device=device)

        # Load voice samples
        print(f"Loading voice samples from {args.voice_dir}...")
        voice_samples = []
        for file in wav_files:
            try:
                full_path = os.path.join(args.voice_dir, file)
                audio = load_audio(full_path, 24000)
                voice_samples.append(audio)
                print(f"Loaded: {file}")
            except Exception as e:
                print(f"Warning: Failed to load {file}: {e}")
                continue

        if not voice_samples:
            print("ERROR: No voice samples could be loaded")
            return 1

        print(f"Successfully loaded {len(voice_samples)} voice samples")

        # Set up output path - ensure it goes to the output directory
        output_dir = os.path.join(os.getcwd(), "output")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"Created output directory: {output_dir}")
        
        output_path = os.path.join(output_dir, args.output)
        print(f"Output will be saved to: {output_path}")

        # Generate speech based on quality setting
        print("Generating speech...")
        
        # Map quality to tortoise presets
        preset_map = {
            "fast": "ultra_fast",
            "medium": "fast", 
            "high": "standard"
        }
        preset = preset_map.get(args.quality, "fast")
        
        try:
            # Use preset first
            print(f"Trying preset: {preset}")
            gen_audio = tts.tts_with_preset(
                text=args.text,
                voice_samples=voice_samples,
                preset=preset
            )
        except Exception as e:
            print(f"Preset failed: {e}")
            print("Falling back to basic generation...")
            try:
                # Fallback to basic generation
                gen_audio = tts.tts(
                    text=args.text,
                    voice_samples=voice_samples
                )
            except Exception as e2:
                print(f"ERROR: All generation methods failed: {e2}")
                return 1

        # Handle audio tensor shape
        print(f"Generated audio shape: {gen_audio.shape}")
        if len(gen_audio.shape) == 3:
            gen_audio_np = gen_audio.squeeze().cpu().numpy()
        elif len(gen_audio.shape) == 2:
            gen_audio_np = gen_audio.squeeze(0).cpu().numpy()
        else:
            gen_audio_np = gen_audio.cpu().numpy()

        print(f"Final audio shape: {gen_audio_np.shape}")

        # Save the generated audio
        sf.write(output_path, gen_audio_np, 24000)
        
        # Verify the file was created and has content
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"SUCCESS: Generated speech saved to {output_path}")
            print(f"File size: {file_size} bytes")
            
            if file_size < 1000:  # Less than 1KB is probably an error
                print("WARNING: Output file is very small, generation may have failed")
                return 1
            
            return 0
        else:
            print("ERROR: Output file was not created")
            return 1

    except KeyboardInterrupt:
        print("\nGeneration interrupted by user")
        return 1
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
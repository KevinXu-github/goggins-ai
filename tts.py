# tts.py - Script to call Tortoise-TTS
import os
import sys
import argparse
import torch
import torchaudio
from tortoise.api import TextToSpeech
from tortoise.utils.audio import load_voice, load_audio

def main():
    parser = argparse.ArgumentParser(description='Generate speech with Tortoise-TTS')
    parser.add_argument('--text', type=str, required=True, help='Text to synthesize')
    parser.add_argument('--voice', type=str, default='goggins', help='Voice to use')
    parser.add_argument('--preset', type=str, default='fast', 
                        choices=['ultra_fast', 'fast', 'standard', 'high_quality'], 
                        help='Quality preset')
    parser.add_argument('--output_path', type=str, required=True, help='Output file path')
    parser.add_argument('--seed', type=int, default=None, help='Random seed for generation')
    parser.add_argument('--emotion', type=str, default='Confident', 
                       help='Emotional tone (e.g., Confident, Excited, Angry)')
    
    args = parser.parse_args()
    
    # Print parameters for debugging
    print(f"Generating speech with the following parameters:")
    print(f"Voice: {args.voice}")
    print(f"Preset: {args.preset}")
    print(f"Output path: {args.output_path}")
    print(f"Text: {args.text[:50]}..." if len(args.text) > 50 else f"Text: {args.text}")
    print(f"Emotion: {args.emotion}")
    
    try:
        # Configure CUDA/GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        if device == "cuda":
            print("Using CUDA for speech generation")
        else:
            print("Using CPU for speech generation (this will be slow)")
        
        # Initialize Tortoise TTS
        tts = TextToSpeech(device=device)
        
        # Load the custom voice
        voice_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voices', args.voice)
        if not os.path.exists(voice_dir):
            print(f"Voice directory not found: {voice_dir}")
            print("Available voices:")
            voices_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'voices')
            for v in os.listdir(voices_root):
                if os.path.isdir(os.path.join(voices_root, v)):
                    print(f" - {v}")
            sys.exit(1)
        
        # Load the voice samples
        print(f"Loading voice samples from {voice_dir}")
        voice_samples, _ = load_voice(args.voice)
        
        # Prepare generation settings based on preset
        if args.preset == 'ultra_fast':
            num_autoregressive_samples = 1
            diffusion_iterations = 30
            cond_free = False
        elif args.preset == 'fast':
            num_autoregressive_samples = 2
            diffusion_iterations = 50
            cond_free = True
        elif args.preset == 'standard':
            num_autoregressive_samples = 3
            diffusion_iterations = 100
            cond_free = True
        else:  # high_quality
            num_autoregressive_samples = 6
            diffusion_iterations = 200
            cond_free = True
        
        # For David Goggins, we want to ensure high energy and intensity
        # Adjust CVVP conditioning and other parameters to increase intensity
        cvvp_amount = 0.0
        if args.emotion == 'Confident' or args.emotion == 'Angry':
            cvvp_amount = 0.8  # Higher values for intense emotions
        
        # Generate the speech
        print("Generating speech with Tortoise-TTS...")
        gen = tts.tts_with_preset(
            text=args.text,
            voice_samples=voice_samples,
            preset=args.preset,
            seed=args.seed,
            emotion=args.emotion,
            conditioning_latents=None  # Can be used for custom emotion/style control
        )
        
        # Save the audio
        torchaudio.save(args.output_path, gen.squeeze(0).cpu(), 24000)
        print(f"Successfully saved audio to {args.output_path}")
        
        # Return success
        return 0
        
    except Exception as e:
        print(f"Error generating speech: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
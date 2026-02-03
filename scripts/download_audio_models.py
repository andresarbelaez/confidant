"""Script to download STT and TTS models."""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from config.settings import get_settings


def main():
    parser = argparse.ArgumentParser(description="Download audio models for dant")
    parser.add_argument(
        "--stt",
        action="store_true",
        help="Download STT (Whisper) model"
    )
    parser.add_argument(
        "--tts",
        action="store_true",
        help="Download TTS model"
    )
    parser.add_argument(
        "--stt-size",
        type=str,
        default="base",
        choices=["tiny", "base", "small", "medium"],
        help="Whisper model size (default: base)"
    )
    
    args = parser.parse_args()
    
    settings = get_settings()
    
    print("="*60)
    print("dant Audio Model Downloader")
    print("="*60)
    
    if args.stt or (not args.stt and not args.tts):
        print(f"\nSTT Model (Whisper {args.stt_size}):")
        print("The faster-whisper library will automatically download")
        print("the model on first use. No manual download needed.")
        print(f"Model will be cached at: ~/.cache/huggingface/")
    
    if args.tts or (not args.stt and not args.tts):
        print(f"\nTTS Model:")
        print("The TTS library will automatically download")
        print("the model on first use. No manual download needed.")
        print(f"Model will be cached at: ~/.local/share/tts/")
    
    print("\nTo trigger downloads, simply run dant - the models will")
    print("be downloaded automatically when first used.")
    print("="*60)


if __name__ == "__main__":
    main()

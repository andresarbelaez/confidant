"""Script to download and quantize LLM models."""

import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from config.settings import get_settings


def download_huggingface_model(repo_id: str, filename: str, output_path: str):
    """Download model from HuggingFace."""
    try:
        from huggingface_hub import hf_hub_download
        from pathlib import Path
        import shutil
        
        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Downloading {filename} from {repo_id}...")
        print("This may take a few minutes depending on your connection...")
        
        # Download to a temporary location first
        downloaded_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir=str(output_dir),
            local_dir_use_symlinks=False
        )
        
        # Move/rename to desired output path if different
        if downloaded_path != output_path:
            if Path(output_path).exists():
                print(f"Warning: {output_path} already exists. Skipping rename.")
            else:
                shutil.move(downloaded_path, output_path)
                print(f"Model saved to: {output_path}")
        else:
            print(f"Model saved to: {output_path}")
        
        return output_path
        
    except ImportError:
        print("huggingface_hub not installed. Install with: pip install huggingface_hub")
        return None
    except Exception as e:
        print(f"Error downloading model: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Download LLM models for dant")
    parser.add_argument(
        "--model",
        type=str,
        default="llama-3.2-3b-instruct",
        help="Model name to download (default: llama-3.2-3b-instruct)"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output path for model file"
    )
    parser.add_argument(
        "--quantization",
        type=str,
        default="Q4_0",
        choices=["Q4_0", "Q4_1", "Q5_0", "Q5_1", "Q8_0"],
        help="Quantization level (default: Q4_0)"
    )
    
    args = parser.parse_args()
    
    settings = get_settings()
    
    # Map model names to HuggingFace repos and filenames
    model_configs = {
        "llama-3.2-3b-instruct": {
            "repo_id": "bartowski/Llama-3.2-3B-Instruct-GGUF",
            "filename_template": "Llama-3.2-3B-Instruct-{quant}.gguf"
        }
    }
    
    if args.model not in model_configs:
        print(f"Error: Model '{args.model}' not supported.")
        print(f"Supported models: {', '.join(model_configs.keys())}")
        sys.exit(1)
    
    config = model_configs[args.model]
    filename = config["filename_template"].format(quant=args.quantization)
    output_path = args.output or str(settings.models_dir / f"{args.model}-{args.quantization.lower()}.gguf")
    
    print("="*60)
    print("dant Model Downloader")
    print("="*60)
    print(f"\nModel: {args.model}")
    print(f"Quantization: {args.quantization}")
    print(f"Output: {output_path}")
    print("="*60)
    
    # Check if file already exists
    if Path(output_path).exists():
        print(f"\n✓ Model already exists at: {output_path}")
        print("Skipping download.")
        return
    
    # Download the model
    result = download_huggingface_model(
        repo_id=config["repo_id"],
        filename=filename,
        output_path=output_path
    )
    
    if result:
        print("\n✓ Model downloaded successfully!")
    else:
        print("\n✗ Download failed. See error messages above.")
        print("\nAlternative: Download manually from:")
        print(f"  https://huggingface.co/{config['repo_id']}")
        sys.exit(1)


if __name__ == "__main__":
    main()

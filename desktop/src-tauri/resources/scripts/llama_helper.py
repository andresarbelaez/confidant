#!/usr/bin/env python3
"""
Llama.cpp Helper Script
Called from Rust/Tauri backend to perform LLM operations using llama-cpp-python
"""

import sys
import json

try:
    from llama_cpp import Llama
except ImportError:
    print("ERROR: llama-cpp-python not installed. Install with: pip install llama-cpp-python", file=sys.stderr)
    sys.exit(1)


# Global model instance
_model = None
_model_path = None


def load_model(model_path: str):
    """Load llama.cpp model"""
    global _model, _model_path
    
    if _model is not None and _model_path == model_path:
        return {"status": "success", "message": "Model already loaded"}
    
    try:
        print(f"Loading model from: {model_path}", file=sys.stderr)
        import os
        try:
            cpu_count = os.cpu_count() or 4
            optimal_threads = max(2, cpu_count - 1)
        except Exception:
            optimal_threads = 4
        n_gpu_layers = -1  # Use GPU when available (Metal on macOS; requires Metal-built llama-cpp-python)
        n_batch = 512  # Larger batch = faster time-to-first-token
        _model = Llama(
            model_path=model_path,
            n_ctx=2048,
            n_threads=optimal_threads,
            verbose=False,
            n_batch=n_batch,
            n_gpu_layers=n_gpu_layers,
            use_mmap=True,
            use_mlock=False,
        )
        _model_path = model_path
        print("Model loaded successfully", file=sys.stderr)
        return {"status": "success", "message": "Model loaded successfully"}
    except Exception as e:
        print(f"Error loading model: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {"status": "error", "message": str(e)}


def generate_text(model_path: str, prompt: str, temperature: float, top_p: float, max_tokens: int):
    """Generate text from the model"""
    global _model, _model_path
    
    # Load model if not loaded or if path changed
    if _model is None or _model_path != model_path:
        print(f"Loading model for generation: {model_path}", file=sys.stderr)
        load_result = load_model(model_path)
        if load_result["status"] != "success":
            return {"status": "error", "message": f"Failed to load model: {load_result.get('message', 'Unknown error')}"}
    
    try:
        print(f"Generating text (prompt length: {len(prompt)}, max_tokens: {max_tokens})", file=sys.stderr)
        # Use minimal stop sequences - only stop at end token
        # Don't use "User:" or "Assistant:" as stop sequences as they appear in prompts
        # Use stop sequences to prevent over-generation
        # Remove "User:" from stop sequences as it might match too early
        # Only stop on obvious continuation patterns
        # Use stop sequences to prevent the model from generating conversation format
        stop_sequences = [
            "User:", "\nUser:", "User: ", "\n\nUser:",
            "user:", "\nuser:", "user: ", "\n\nuser:",
            "\n\nAssistant:", "\nAssistant:", " Assistant:",
            "\n\nassistant:", "\nassistant:", " assistant:",
            "Doctor:", "\nDoctor:", "Doctor: ", "\n\nDoctor:",
            "Patient:", "\nPatient:", "Patient: ", "\n\nPatient:",
        ]
        
        response = _model(
            prompt,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            echo=False,
            stop=stop_sequences
        )
        
        text = response["choices"][0]["text"]
        # Clean up any trailing whitespace
        text = text.strip()
        
        # Remove any "User:" or "Assistant:" labels that might have been generated (case-insensitive)
        # This can happen if the model starts generating a conversation format
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            line_lower = line.strip().lower()
            # Skip lines that start with "User:" or "Assistant:" (case-insensitive)
            if line_lower.startswith('user:') or line_lower.startswith('assistant:'):
                # If it's an "Assistant:" line, take the content after it
                if line_lower.startswith('assistant:'):
                    # Handle both "Assistant:" and "assistant:"
                    content = line.split(':', 1)[1].strip() if ':' in line else line
                    if content:
                        cleaned_lines.append(content)
                # Otherwise skip "User:" lines entirely
                continue
            cleaned_lines.append(line)
        
        text = '\n'.join(cleaned_lines).strip()
        
        # Final cleanup: remove any trailing "assistant:" or "Assistant:" text
        import re
        text = re.sub(r'\s+[Aa]ssistant:\s*.*$', '', text).strip()
        
        # If text is very long, truncate at a reasonable point (e.g., after 5th separator)
        if "---MESSAGE_BREAK---" in text:
            parts = text.split("---MESSAGE_BREAK---")
            # Take first 5 messages max
            if len(parts) > 5:
                text = "---MESSAGE_BREAK---".join(parts[:5])
        
        print(f"Generated text length: {len(text)}", file=sys.stderr)
        
        # Debug: always print preview to see what we're getting
        if len(text) < 200:
            print(f"Generated text (full): {repr(text)}", file=sys.stderr)
        else:
            print(f"Generated text preview (first 300 chars): {text[:300]}...", file=sys.stderr)
        
        return {
            "status": "success",
            "text": text,
            "finish_reason": "stop"
        }
    except Exception as e:
        print(f"Error generating text: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {"status": "error", "message": str(e)}


def generate_stream(model_path: str, prompt: str, temperature: float, top_p: float, max_tokens: int):
    """Stream generated text as JSON lines: {"text": "..."} per chunk, then {"done": true, "full": "..."}."""
    global _model, _model_path

    if _model is None or _model_path != model_path:
        print(f"Loading model for stream: {model_path}", file=sys.stderr)
        load_result = load_model(model_path)
        if load_result["status"] != "success":
            print(json.dumps({"error": f"Failed to load model: {load_result.get('message', 'Unknown error')}"}), flush=True)
            return
    try:
        stop_sequences = [
            "User:", "\nUser:", "User: ", "\n\nUser:",
            "user:", "\nuser:", "user: ", "\n\nuser:",
            "\n\nAssistant:", "\nAssistant:", " Assistant:",
            "\n\nassistant:", "\nassistant:", " assistant:",
            "Doctor:", "\nDoctor:", "Doctor: ", "\n\nDoctor:",
            "Patient:", "\nPatient:", "Patient: ", "\n\nPatient:",
        ]
        full_parts = []
        stream = _model.create_completion(
            prompt,
            temperature=temperature,
            top_p=top_p,
            max_tokens=max_tokens,
            echo=False,
            stop=stop_sequences,
            stream=True,
        )
        for chunk in stream:
            text = chunk.get("choices", [{}])[0].get("text", "")
            if text:
                full_parts.append(text)
                print(json.dumps({"text": text}), flush=True)
        full = "".join(full_parts).strip()
        import re
        full = re.sub(r'\s+[Aa]ssistant:\s*.*$', '', full).strip()
        print(json.dumps({"done": True, "full": full}), flush=True)
    except Exception as e:
        print(f"Error in stream: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": str(e)}), flush=True)


def main():
    if len(sys.argv) < 2:
        print("ERROR: Missing command", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "load":
            model_path = sys.argv[2]
            result = load_model(model_path)
            print(json.dumps(result))
            
        elif command == "generate":
            if len(sys.argv) < 4:
                print("ERROR: Missing arguments for generate command (need model_path and config)", file=sys.stderr)
                sys.exit(1)
            model_path = sys.argv[2]
            config_json = sys.argv[3]
            prompt = sys.stdin.read()
            config = json.loads(config_json)
            
            result = generate_text(
                model_path=model_path,
                prompt=prompt,
                temperature=config.get("temperature", 0.7),
                top_p=config.get("top_p", 0.9),
                max_tokens=config.get("max_tokens", 512)
            )
            print(json.dumps(result))
            sys.stdout.flush()  # Ensure output is flushed

        elif command == "generate_stream":
            if len(sys.argv) < 4:
                print("ERROR: Missing arguments for generate_stream (need model_path and config)", file=sys.stderr)
                sys.exit(1)
            model_path = sys.argv[2]
            config_json = sys.argv[3]
            prompt = sys.stdin.read()
            config = json.loads(config_json)
            generate_stream(
                model_path=model_path,
                prompt=prompt,
                temperature=config.get("temperature", 0.7),
                top_p=config.get("top_p", 0.9),
                max_tokens=config.get("max_tokens", 512),
            )
            
        else:
            print(f"ERROR: Unknown command: {command}", file=sys.stderr)
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

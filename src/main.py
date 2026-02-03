"""Main entry point for dant application."""

import argparse
import sys
import time
import numpy as np
import queue
from pathlib import Path

# Add project root to path so we can import src as a package
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.audio.audio_io import AudioIO
from src.audio.stt_engine import STTEngine
from src.audio.tts_engine import TTSEngine
from src.audio.push_to_talk import PushToTalk
from src.agent.core import DantAgent
from src.config.settings import get_settings


def run_audio_interface():
    """Run the main audio interface."""
    print("Initializing dant...")
    settings = get_settings()
    
    # Initialize components
    print("Loading audio components...")
    audio_io = AudioIO()
    stt_engine = STTEngine()
    tts_engine = TTSEngine()
    
    print("Loading AI agent...")
    agent = DantAgent()
    
    print("Setting up push-to-talk...")
    
    import platform
    keyboard_available = True
    if platform.system() == "Darwin":  # macOS
        try:
            # Try to use keyboard library - this will fail if no permissions
            # We need to test by trying to set up a hook (which requires permissions)
            import keyboard as kb_test
            # Just test if we can check a key without setting up a listener
            _ = kb_test.is_pressed('space')
            print("✓ Keyboard monitoring available")
        except (OSError, PermissionError) as e:
            if "Error 13" in str(e) or "administrator" in str(e).lower() or "permission" in str(e).lower():
                print("\n⚠ WARNING: Keyboard monitoring requires Accessibility permissions!")
                print("\n   To fix this:")
                print("   1. Go to System Settings > Privacy & Security > Accessibility")
                print("   2. Add Terminal (or Cursor/your IDE) to the allowed apps")
                print("   3. Restart this application")
                print("\n   For now, using Enter key as fallback (press Enter to start recording)")
                keyboard_available = False
            else:
                print(f"⚠ Keyboard error: {e}")
                keyboard_available = False
    
    if keyboard_available:
        try:
            ptt = PushToTalk()
            ptt.start()  # Start listening for key presses
            # Wait a moment to see if it fails
            time.sleep(0.2)
            push_to_talk_key = ptt.key
        except (OSError, PermissionError) as e:
            print(f"\n⚠ Could not start keyboard monitoring: {e}")
            print("   Falling back to text input mode")
            keyboard_available = False
            ptt = None
            push_to_talk_key = None
    else:
        # Fallback: use text input instead
        ptt = None
        push_to_talk_key = None
    
    print("\n" + "="*50)
    print("dant is ready!")
    if ptt and push_to_talk_key:
        print(f"Press and hold '{push_to_talk_key}' to speak")
    else:
        print("Keyboard monitoring unavailable - using text input mode")
        print("Type your message and press Enter")
    print("Press Ctrl+C to exit")
    print("="*50 + "\n")
    
    # Audio recording state
    audio_queue = queue.Queue()
    is_recording = False
    
    def audio_callback(indata):
        """Callback for audio input stream."""
        if is_recording:
            audio_queue.put(indata.copy())
    
    # Main loop
    try:
        print("[Ready] ", end="", flush=True)
        
        if ptt and push_to_talk_key:
            # Use push-to-talk with keyboard monitoring
            with audio_io.create_input_stream(audio_callback):
                while True:
                    # Check for push-to-talk activation
                    if ptt.is_active() and not is_recording:
                        # Start recording
                        is_recording = True
                        audio_chunks = []
                        print("\n[Recording...] ", end="", flush=True)
                        
                        # Collect audio while key is pressed
                        while ptt.is_active():
                            try:
                                chunk = audio_queue.get(timeout=0.1)
                                audio_chunks.append(chunk)
                            except queue.Empty:
                                pass
                            time.sleep(0.01)
                        
                        # Stop recording
                        is_recording = False
                        
                        if audio_chunks:
                            print("\n[Processing...]")
                            audio = np.concatenate(audio_chunks)
                            
                            # Transcribe
                            print("Transcribing...")
                            text = stt_engine.transcribe(audio, sample_rate=audio_io.sample_rate)
                            print(f"You: {text}")
                            
                            if text.strip():
                                # Get agent response
                                print("Thinking...")
                                response = agent.process_query(text)
                                print(f"dant: {response}")
                                
                                # Synthesize and play
                                print("Speaking...")
                                audio_response = tts_engine.synthesize(response)
                                audio_io.play(audio_response)
                                print("\n[Ready] ", end="", flush=True)
                            else:
                                print("No speech detected.\n[Ready] ", end="", flush=True)
                        else:
                            print("\n[Ready] ", end="", flush=True)
                    
                    time.sleep(0.1)
        else:
            # Fallback: text input mode (no keyboard monitoring)
            print("Text input mode - keyboard monitoring unavailable")
            print("Enter your queries as text (audio input disabled)\n")
            while True:
                try:
                    query = input("You: ").strip()
                    if not query:
                        continue
                    
                    if query.lower() in ['quit', 'exit', 'q']:
                        break
                    
                    # Get agent response
                    print("Thinking...")
                    response = agent.process_query(query)
                    print(f"dant: {response}\n")
                except KeyboardInterrupt:
                    break
    
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        if ptt:
            ptt.stop()
        print("Goodbye!")


def run_setup_gui():
    """Run the setup GUI."""
    from src.gui.setup_window import SetupWindow
    import sys
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    window = SetupWindow()
    window.show()
    sys.exit(app.exec())


def run_text_interface():
    """Run text-only interface (no audio, no keyboard)."""
    print("Initializing dant (text mode)...")
    
    print("Loading AI agent...")
    agent = DantAgent()
    
    print("\n" + "="*50)
    print("dant is ready! (Text input mode)")
    print("Type your questions and press Enter")
    print("Type 'quit' or 'exit' to stop")
    print("="*50 + "\n")
    
    while True:
        try:
            query = input("You: ").strip()
            if not query:
                continue
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("Goodbye!")
                break
            
            # Get agent response
            print("Thinking...")
            response = agent.process_query(query, use_rag=True, stream=False)
            print(f"dant: {response}\n")
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="dant - Off-the-grid AI agent")
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Run setup/configuration GUI"
    )
    parser.add_argument(
        "--text",
        action="store_true",
        help="Run in text-only mode (no audio, no keyboard)"
    )
    
    args = parser.parse_args()
    
    if args.setup:
        run_setup_gui()
    elif args.text:
        run_text_interface()
    else:
        run_audio_interface()


if __name__ == "__main__":
    main()

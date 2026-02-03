"""Push-to-talk mechanism."""

import keyboard
import threading
from typing import Optional, Callable
import time

from ..config.settings import get_settings


class PushToTalk:
    """Manages push-to-talk functionality."""
    
    def __init__(
        self,
        key: Optional[str] = None,
        callback: Optional[Callable[[bool], None]] = None
    ):
        """
        Initialize push-to-talk.
        
        Args:
            key: Key to use for push-to-talk (e.g., 'space'). If None, uses default from config.
            callback: Optional callback function called when key state changes (True = pressed, False = released)
        """
        settings = get_settings()
        self.key = key or settings.get("audio.push_to_talk_key", "space")
        self.callback = callback
        self.is_pressed = False
        self._running = False
        self._thread: Optional[threading.Thread] = None
    
    def start(self) -> None:
        """Start listening for push-to-talk key."""
        if self._running:
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._listen_loop, daemon=True)
        self._thread.start()
        
        # Give it a moment to start and check for immediate errors
        time.sleep(0.1)
        if self._thread.is_alive():
            return
        else:
            # Thread died immediately, likely due to permissions
            self._running = False
            raise OSError("Keyboard monitoring failed - requires Accessibility permissions on macOS")
    
    def stop(self) -> None:
        """Stop listening for push-to-talk key."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=1.0)
    
    def _listen_loop(self) -> None:
        """Main loop for listening to key presses."""
        was_pressed = False
        error_shown = False
        
        while self._running:
            try:
                is_pressed = keyboard.is_pressed(self.key)
                
                if is_pressed != was_pressed:
                    self.is_pressed = is_pressed
                    was_pressed = is_pressed
                    
                    if self.callback:
                        self.callback(is_pressed)
                
                time.sleep(0.01)  # Small delay to avoid CPU spinning
            except (OSError, PermissionError) as e:
                if not error_shown:
                    # Only show error once
                    error_shown = True
                    # Don't print here - let main.py handle it
                    # Just mark that keyboard isn't working
                    self.is_pressed = False
                time.sleep(0.1)
            except Exception as e:
                if not error_shown:
                    error_shown = True
                time.sleep(0.1)
    
    def is_active(self) -> bool:
        """Check if push-to-talk is currently active (key pressed)."""
        return self.is_pressed
    
    def wait_for_press(self, timeout: Optional[float] = None) -> bool:
        """
        Wait for key to be pressed.
        
        Args:
            timeout: Maximum time to wait in seconds. If None, waits indefinitely.
            
        Returns:
            True if key was pressed, False if timeout
        """
        start_time = time.time()
        while not self.is_pressed:
            if timeout and (time.time() - start_time) > timeout:
                return False
            time.sleep(0.01)
        return True
    
    def wait_for_release(self, timeout: Optional[float] = None) -> bool:
        """
        Wait for key to be released.
        
        Args:
            timeout: Maximum time to wait in seconds. If None, waits indefinitely.
            
        Returns:
            True if key was released, False if timeout
        """
        start_time = time.time()
        while self.is_pressed:
            if timeout and (time.time() - start_time) > timeout:
                return False
            time.sleep(0.01)
        return True

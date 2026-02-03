"""Configuration management for dant."""

import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings:
    """Manages application settings and configuration."""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize settings.
        
        Args:
            config_path: Path to config YAML file. If None, uses default location.
        """
        self.base_dir = Path(__file__).parent.parent.parent
        self.config_path = Path(config_path) if config_path else self.base_dir / "config.yaml"
        
        # Default settings
        self.defaults = {
            "paths": {
                "models_dir": str(self.base_dir / "data" / "models"),
                "knowledge_dir": str(self.base_dir / "data" / "knowledge"),
                "llm_model": str(self.base_dir / "data" / "models" / "llama-3.2-3b-instruct-q4_0.gguf"),
                "stt_model": str(self.base_dir / "data" / "models" / "whisper-base"),
                "tts_model": str(self.base_dir / "data" / "models" / "tts"),
                "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
            },
            "llm": {
                "context_size": 4096,
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "repeat_penalty": 1.1,
                "n_threads": 4,
            },
            "rag": {
                "chunk_size": 512,
                "chunk_overlap": 50,
                "top_k": 3,
                "similarity_threshold": 0.7,
            },
            "audio": {
                "sample_rate": 16000,
                "chunk_size": 1024,
                "channels": 1,
                "input_device": None,  # Auto-detect
                "output_device": None,  # Auto-detect
                "push_to_talk_key": "space",
                "vad_threshold": 0.5,  # Voice activity detection
            },
            "stt": {
                "model_size": "base",
                "language": "en",
                "device": "cpu",
                "compute_type": "int8",
            },
            "tts": {
                "model_name": "tts_models/en/ljspeech/tacotron2-DDC",
                "device": "cpu",
            },
            "knowledge": {
                "collection_name": "dant_knowledge",
                "persist_directory": str(self.base_dir / "data" / "knowledge" / "chroma_db"),
            },
        }
        
        # Load configuration
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or create default."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    file_config = yaml.safe_load(f) or {}
                # Merge with defaults
                config = self._deep_merge(self.defaults.copy(), file_config)
                return config
            except Exception as e:
                print(f"Warning: Could not load config file: {e}. Using defaults.")
                return self.defaults.copy()
        else:
            # Create default config file
            self._save_config(self.defaults)
            return self.defaults.copy()
    
    def _deep_merge(self, base: Dict, override: Dict) -> Dict:
        """Deep merge two dictionaries."""
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save configuration to file."""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w") as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)
        except Exception as e:
            print(f"Warning: Could not save config file: {e}")
    
    def save(self) -> None:
        """Save current configuration to file."""
        self._save_config(self.config)
    
    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get configuration value by dot-separated path.
        
        Args:
            key_path: Dot-separated path (e.g., "llm.temperature")
            default: Default value if key not found
            
        Returns:
            Configuration value
        """
        keys = key_path.split(".")
        value = self.config
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        return value
    
    def set(self, key_path: str, value: Any) -> None:
        """
        Set configuration value by dot-separated path.
        
        Args:
            key_path: Dot-separated path (e.g., "llm.temperature")
            value: Value to set
        """
        keys = key_path.split(".")
        config = self.config
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        config[keys[-1]] = value
    
    @property
    def llm_model_path(self) -> str:
        """Get LLM model path."""
        return self.get("paths.llm_model")
    
    @property
    def stt_model_path(self) -> str:
        """Get STT model path."""
        return self.get("paths.stt_model")
    
    @property
    def tts_model_path(self) -> str:
        """Get TTS model path."""
        return self.get("paths.tts_model")
    
    @property
    def knowledge_db_path(self) -> str:
        """Get knowledge database path."""
        return self.get("knowledge.persist_directory")
    
    @property
    def models_dir(self) -> Path:
        """Get models directory."""
        return Path(self.get("paths.models_dir"))
    
    @property
    def knowledge_dir(self) -> Path:
        """Get knowledge directory."""
        return Path(self.get("paths.knowledge_dir"))


# Global settings instance
_settings: Optional[Settings] = None


def get_settings(config_path: Optional[str] = None) -> Settings:
    """Get global settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings(config_path)
    return _settings

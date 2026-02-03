"""Setup/configuration GUI window."""

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QPushButton, QFileDialog, QComboBox, QTextEdit,
    QGroupBox, QFormLayout, QMessageBox, QSpinBox, QDoubleSpinBox
)
from PyQt6.QtCore import Qt
from pathlib import Path
import sounddevice as sd

from ..config.settings import get_settings


class SetupWindow(QMainWindow):
    """Setup and configuration window."""
    
    def __init__(self):
        super().__init__()
        self.settings = get_settings()
        self.init_ui()
        self.load_current_settings()
    
    def init_ui(self):
        """Initialize the UI."""
        self.setWindowTitle("dant - Setup & Configuration")
        self.setMinimumSize(800, 600)
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QVBoxLayout()
        central_widget.setLayout(main_layout)
        
        # Paths section
        paths_group = QGroupBox("Model Paths")
        paths_layout = QFormLayout()
        
        self.llm_model_path = QLineEdit()
        self.llm_model_path.setPlaceholderText("Path to LLM model file (.gguf)")
        llm_browse_btn = QPushButton("Browse...")
        llm_browse_btn.clicked.connect(lambda: self.browse_file(self.llm_model_path, "GGUF Files (*.gguf)"))
        llm_layout = QHBoxLayout()
        llm_layout.addWidget(self.llm_model_path)
        llm_layout.addWidget(llm_browse_btn)
        paths_layout.addRow("LLM Model:", llm_layout)
        
        self.stt_model_path = QLineEdit()
        self.stt_model_path.setPlaceholderText("Path to STT model directory")
        stt_browse_btn = QPushButton("Browse...")
        stt_browse_btn.clicked.connect(lambda: self.browse_directory(self.stt_model_path))
        stt_layout = QHBoxLayout()
        stt_layout.addWidget(self.stt_model_path)
        stt_layout.addWidget(stt_browse_btn)
        paths_layout.addRow("STT Model:", stt_layout)
        
        self.tts_model_path = QLineEdit()
        self.tts_model_path.setPlaceholderText("TTS model name")
        paths_layout.addRow("TTS Model:", self.tts_model_path)
        
        self.knowledge_db_path = QLineEdit()
        self.knowledge_db_path.setPlaceholderText("Path to knowledge database")
        kb_browse_btn = QPushButton("Browse...")
        kb_browse_btn.clicked.connect(lambda: self.browse_directory(self.knowledge_db_path))
        kb_layout = QHBoxLayout()
        kb_layout.addWidget(self.knowledge_db_path)
        kb_layout.addWidget(kb_browse_btn)
        paths_layout.addRow("Knowledge DB:", kb_layout)
        
        paths_group.setLayout(paths_layout)
        main_layout.addWidget(paths_group)
        
        # Audio settings section
        audio_group = QGroupBox("Audio Settings")
        audio_layout = QFormLayout()
        
        # Input device
        self.input_device_combo = QComboBox()
        self.input_device_combo.setEditable(False)
        self.populate_audio_devices()
        audio_layout.addRow("Input Device:", self.input_device_combo)
        
        # Output device
        self.output_device_combo = QComboBox()
        self.output_device_combo.setEditable(False)
        self.populate_audio_devices(output=True)
        audio_layout.addRow("Output Device:", self.output_device_combo)
        
        # Push-to-talk key
        self.ptt_key = QLineEdit()
        self.ptt_key.setPlaceholderText("space")
        audio_layout.addRow("Push-to-Talk Key:", self.ptt_key)
        
        # Sample rate
        self.sample_rate = QSpinBox()
        self.sample_rate.setRange(8000, 48000)
        self.sample_rate.setSingleStep(1000)
        audio_layout.addRow("Sample Rate:", self.sample_rate)
        
        audio_group.setLayout(audio_layout)
        main_layout.addWidget(audio_group)
        
        # LLM settings section
        llm_group = QGroupBox("LLM Settings")
        llm_layout = QFormLayout()
        
        self.context_size = QSpinBox()
        self.context_size.setRange(512, 8192)
        self.context_size.setSingleStep(512)
        llm_layout.addRow("Context Size:", self.context_size)
        
        self.temperature = QDoubleSpinBox()
        self.temperature.setRange(0.0, 2.0)
        self.temperature.setSingleStep(0.1)
        self.temperature.setDecimals(1)
        llm_layout.addRow("Temperature:", self.temperature)
        
        self.top_p = QDoubleSpinBox()
        self.top_p.setRange(0.0, 1.0)
        self.top_p.setSingleStep(0.05)
        self.top_p.setDecimals(2)
        llm_layout.addRow("Top-P:", self.top_p)
        
        self.n_threads = QSpinBox()
        self.n_threads.setRange(1, 16)
        llm_layout.addRow("Threads:", self.n_threads)
        
        llm_group.setLayout(llm_layout)
        main_layout.addWidget(llm_group)
        
        # RAG settings section
        rag_group = QGroupBox("RAG Settings")
        rag_layout = QFormLayout()
        
        self.top_k = QSpinBox()
        self.top_k.setRange(1, 20)
        rag_layout.addRow("Top-K Results:", self.top_k)
        
        self.similarity_threshold = QDoubleSpinBox()
        self.similarity_threshold.setRange(0.0, 1.0)
        self.similarity_threshold.setSingleStep(0.05)
        self.similarity_threshold.setDecimals(2)
        rag_layout.addRow("Similarity Threshold:", self.similarity_threshold)
        
        rag_group.setLayout(rag_layout)
        main_layout.addWidget(rag_group)
        
        # Buttons
        button_layout = QHBoxLayout()
        
        save_btn = QPushButton("Save Settings")
        save_btn.clicked.connect(self.save_settings)
        button_layout.addWidget(save_btn)
        
        reset_btn = QPushButton("Reset to Defaults")
        reset_btn.clicked.connect(self.reset_to_defaults)
        button_layout.addWidget(reset_btn)
        
        button_layout.addStretch()
        
        main_layout.addLayout(button_layout)
    
    def populate_audio_devices(self, output: bool = False):
        """Populate audio device combo box."""
        combo = self.output_device_combo if output else self.input_device_combo
        
        combo.clear()
        combo.addItem("Default (Auto-detect)", None)
        
        devices = sd.query_devices()
        for i, device in enumerate(devices):
            device_type = "output" if device['max_output_channels'] > 0 else "input"
            if (output and device['max_output_channels'] > 0) or (not output and device['max_input_channels'] > 0):
                name = f"{i}: {device['name']} ({device_type})"
                combo.addItem(name, i)
    
    def browse_file(self, line_edit: QLineEdit, file_filter: str = ""):
        """Open file browser."""
        current_path = line_edit.text() or str(Path.home())
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Select File", current_path, file_filter
        )
        if file_path:
            line_edit.setText(file_path)
    
    def browse_directory(self, line_edit: QLineEdit):
        """Open directory browser."""
        current_path = line_edit.text() or str(Path.home())
        dir_path = QFileDialog.getExistingDirectory(
            self, "Select Directory", current_path
        )
        if dir_path:
            line_edit.setText(dir_path)
    
    def load_current_settings(self):
        """Load current settings into UI."""
        # Paths
        self.llm_model_path.setText(self.settings.get("paths.llm_model", ""))
        self.stt_model_path.setText(self.settings.get("paths.stt_model", ""))
        self.tts_model_path.setText(self.settings.get("tts.model_name", ""))
        self.knowledge_db_path.setText(self.settings.get("knowledge.persist_directory", ""))
        
        # Audio
        input_device = self.settings.get("audio.input_device")
        if input_device is not None:
            index = self.input_device_combo.findData(input_device)
            if index >= 0:
                self.input_device_combo.setCurrentIndex(index)
        
        output_device = self.settings.get("audio.output_device")
        if output_device is not None:
            index = self.output_device_combo.findData(output_device)
            if index >= 0:
                self.output_device_combo.setCurrentIndex(index)
        
        self.ptt_key.setText(self.settings.get("audio.push_to_talk_key", "space"))
        self.sample_rate.setValue(self.settings.get("audio.sample_rate", 16000))
        
        # LLM
        self.context_size.setValue(self.settings.get("llm.context_size", 4096))
        self.temperature.setValue(self.settings.get("llm.temperature", 0.7))
        self.top_p.setValue(self.settings.get("llm.top_p", 0.9))
        self.n_threads.setValue(self.settings.get("llm.n_threads", 4))
        
        # RAG
        self.top_k.setValue(self.settings.get("rag.top_k", 3))
        self.similarity_threshold.setValue(self.settings.get("rag.similarity_threshold", 0.7))
    
    def save_settings(self):
        """Save settings from UI."""
        try:
            # Paths
            self.settings.set("paths.llm_model", self.llm_model_path.text())
            self.settings.set("paths.stt_model", self.stt_model_path.text())
            self.settings.set("tts.model_name", self.tts_model_path.text())
            self.settings.set("knowledge.persist_directory", self.knowledge_db_path.text())
            
            # Audio
            input_device = self.input_device_combo.currentData()
            self.settings.set("audio.input_device", input_device)
            
            output_device = self.output_device_combo.currentData()
            self.settings.set("audio.output_device", output_device)
            
            self.settings.set("audio.push_to_talk_key", self.ptt_key.text() or "space")
            self.settings.set("audio.sample_rate", self.sample_rate.value())
            
            # LLM
            self.settings.set("llm.context_size", self.context_size.value())
            self.settings.set("llm.temperature", self.temperature.value())
            self.settings.set("llm.top_p", self.top_p.value())
            self.settings.set("llm.n_threads", self.n_threads.value())
            
            # RAG
            self.settings.set("rag.top_k", self.top_k.value())
            self.settings.set("rag.similarity_threshold", self.similarity_threshold.value())
            
            # Save to file
            self.settings.save()
            
            QMessageBox.information(self, "Success", "Settings saved successfully!")
        
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save settings: {e}")
    
    def reset_to_defaults(self):
        """Reset settings to defaults."""
        reply = QMessageBox.question(
            self,
            "Reset to Defaults",
            "Are you sure you want to reset all settings to defaults?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # Reset settings object
            self.settings.config = self.settings.defaults.copy()
            self.load_current_settings()
            QMessageBox.information(self, "Reset", "Settings reset to defaults. Click 'Save Settings' to apply.")

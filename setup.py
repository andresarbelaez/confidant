from setuptools import setup, find_packages

setup(
    name="dant",
    version="0.1.0",
    description="Off-the-grid AI agent with voice interface",
    author="dant team",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.11",
    install_requires=[
        "python-dotenv>=1.0.0",
        "llama-cpp-python>=0.2.0",
        "chromadb>=0.4.0",
        "sentence-transformers>=2.2.0",
        "torch>=2.0.0",
        "faster-whisper>=0.10.0",
        "TTS>=0.22.0",
        "pyaudio>=0.2.14",
        "sounddevice>=0.4.6",
        "numpy>=1.24.0",
        "PyQt6>=6.6.0",
        "pyyaml>=6.0",
        "tqdm>=4.66.0",
    ],
    entry_points={
        "console_scripts": [
            "dant=main:main",
        ],
    },
)

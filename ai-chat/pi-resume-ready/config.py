"""
Configuration settings for the Research Mentor Agent
"""

import os
from typing import Dict, Any
from pathlib import Path

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = Path('.') / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    # python-dotenv not installed, skip loading .env file
    pass

class Config:
    """Application configuration"""
    
    # API Configuration - CHANGE: Updated to use latest OpenAI models
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL_SEARCH = "gpt-5-mini"  # Latest GPT-4o for complex analysis
    OPENAI_MODEL_PARSE = "gpt-5-mini"  # Cost-effective for parsing tasks
    OPENAI_MODEL_MESSAGE = "gpt-5-mini"  # High-quality message generation
    
    # File Paths
    DEFAULT_RESUME_PATH = "resume.txt"
    OUTPUT_DIRECTORY = "output"
    
    # Rate Limiting
    REQUEST_DELAY_SECONDS = 2
    MAX_RETRIES = 3
    TIMEOUT_SECONDS = 30
    
    # Message Configuration
    MAX_MESSAGE_LENGTH = 300
    TEMPERATURE_SEARCH = 0.3
    TEMPERATURE_PARSE = 0.1
    TEMPERATURE_MESSAGE = 0.4
    
    # Logging
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY environment variable is required. "
                "Set it using: export OPENAI_API_KEY='your-key-here' "
                "or create a .env file with OPENAI_API_KEY=your-key-here"
            )
        return True
    
    @classmethod
    def get_model_config(cls) -> Dict[str, Any]:
        """Get model configuration for different tasks"""
        return {
            "search": {
                "model": cls.OPENAI_MODEL_SEARCH,
                "temperature": cls.TEMPERATURE_SEARCH,
                "max_tokens": 1500
            },
            "parse": {
                "model": cls.OPENAI_MODEL_PARSE,
                "temperature": cls.TEMPERATURE_PARSE,
                "max_tokens": 800
            },
            "message": {
                "model": cls.OPENAI_MODEL_MESSAGE,
                "temperature": cls.TEMPERATURE_MESSAGE,
                "max_tokens": 1000
            }
        }
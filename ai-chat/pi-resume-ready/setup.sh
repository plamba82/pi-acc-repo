#!/bin/bash
# Setup script for Research Mentor Agent

echo "Setting up Research Mentor Agent..."

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p output
mkdir -p logs

# Create .env file template
cat > .env << EOF
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize file paths
RESUME_PATH=resume.txt
OUTPUT_DIR=output
EOF

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to .env file"
echo "2. Update resume.txt with your information"
echo "3. Run: python main.py"
echo ""
echo "For CLI usage: python cli.py --help"
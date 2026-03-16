#!/bin/bash
# Test the setup and basic functionality

echo "Testing Research Mentor Agent setup..."

# Check Python version
python3 --version

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" != "" ]]; then
    echo "✓ Virtual environment is active"
else
    echo "⚠ Virtual environment not active. Run: source venv/bin/activate"
fi

# Check if required files exist
if [ -f "resume.txt" ]; then
    echo "✓ Resume file found"
else
    echo "⚠ Resume file missing. Please create resume.txt"
fi

if [ -f ".env" ]; then
    echo "✓ Environment file found"
else
    echo "⚠ Environment file missing. Run setup.sh first"
fi

# Test imports
python3 -c "
try:
    import openai, aiohttp, asyncio
    print('✓ All dependencies imported successfully')
except ImportError as e:
    print(f'✗ Import error: {e}')
"

# Test CLI help
echo ""
echo "Testing CLI interface..."
python3 cli.py --help > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ CLI interface working"
else
    echo "✗ CLI interface error"
fi

echo ""
echo "Setup verification complete!"
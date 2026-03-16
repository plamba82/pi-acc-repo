 # Code generated via "Slingshot" 
#!/usr/bin/env python3
"""
Command Line Interface for Research Mentor Agent
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import List
from main import ResearchMentorAgent, PersonProfile, ResearchRequest
from config import Config

def create_person_from_args(args) -> PersonProfile:
    """Create PersonProfile from command line arguments"""
    return PersonProfile(
        name=args.name,
        email=args.email,
        university=args.university,
        department=args.department
    )

def create_research_request_from_args(args) -> ResearchRequest:
    """Create ResearchRequest from command line arguments"""
    skills = args.skills.split(',') if args.skills else []
    skills = [skill.strip() for skill in skills]
    
    return ResearchRequest(
        student_level=args.level,
        research_topic=args.topic,
        duration=args.duration,
        skills_needed=skills,
        timeline=args.timeline
    )

def load_contacts_from_file(file_path: str) -> List[PersonProfile]:
    """Load multiple contacts from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        contacts = []
        for contact_data in data:
            contact = PersonProfile(
                name=contact_data['name'],
                email=contact_data['email'],
                university=contact_data['university'],
                department=contact_data['department']
            )
            contacts.append(contact)
        
        return contacts
        
    except Exception as e:
        print(f"Error loading contacts from {file_path}: {e}")
        sys.exit(1)

async def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="AI Research Mentor Agent - Find and personalize outreach to academic mentors",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single contact
  python cli.py --name "Dr. Jane Smith" --email "jane@university.edu" \\
                --university "Stanford" --department "Computer Science" \\
                --topic "Machine Learning" --level "senior"
  
  # Batch processing
  python cli.py --contacts contacts.json --topic "AI Research" --level "junior"
  
  # Custom resume file
  python cli.py --resume my_resume.txt --name "Dr. John Doe" \\
                --email "john@university.edu" --university "MIT" \\
                --department "Physics" --topic "Quantum Computing"
        """
    )
    
    # Contact information (single contact)
    parser.add_argument('--name', help='Professor/researcher name')
    parser.add_argument('--email', help='Professor/researcher email')
    parser.add_argument('--university', help='University name')
    parser.add_argument('--department', help='Department name')
    
    # Batch processing
    parser.add_argument('--contacts', help='JSON file with multiple contacts')
    
    # Research request information
    parser.add_argument('--topic', required=True, help='Research topic/area')
    parser.add_argument('--level', choices=['junior', 'senior'], required=True,
                       help='Student level (junior or senior)')
    parser.add_argument('--duration', default='6 months', help='Project duration')
    parser.add_argument('--skills', help='Required skills (comma-separated)')
    parser.add_argument('--timeline', default='Starting next semester', help='Project timeline')
    
    # Configuration
    parser.add_argument('--resume', default='resume.txt', help='Path to resume file')
    parser.add_argument('--output', help='Output file path (default: auto-generated)')
    
    args = parser.parse_args()
    
    # Validate configuration
    try:
        Config.validate()
    except ValueError as e:
        print(f"Configuration error: {e}")
        sys.exit(1)
    
    # Validate input
    if not args.contacts and not all([args.name, args.email, args.university, args.department]):
        print("Error: Either provide --contacts file or all individual contact details (--name, --email, --university, --department)")
        sys.exit(1)
    
    try:
        # Initialize agent
        agent = ResearchMentorAgent(Config.OPENAI_API_KEY, args.resume)
        await agent.initialize()
        
        # Create research request
        research_request = create_research_request_from_args(args)
        
        # Process contacts
        if args.contacts:
            # Batch processing
            contacts = load_contacts_from_file(args.contacts)
            print(f"Processing {len(contacts)} contacts...")
            
            results = await agent.batch_process_contacts(contacts, research_request)
            
            # Save batch results
            output_file = args.output or f"batch_outreach_results_{research_request.student_level}_{len(contacts)}_contacts.json"
            
        else:
            # Single contact processing
            person = create_person_from_args(args)
            print(f"Processing contact: {person.name}")
            
            result = await agent.find_and_personalize_outreach(person, research_request)
            results = [result]
            
            # Save single result
            output_file = args.output or f"outreach_{person.name.replace(' ', '_')}.json"
        
        # Save results to file
        Path(output_file).parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        # Display summary
        print(f"\n{'='*60}")
        print(f"PROCESSING COMPLETE")
        print(f"{'='*60}")
        print(f"Contacts processed: {len(results)}")
        print(f"Results saved to: {output_file}")
        
        # Display first result preview
        if results and 'personalized_message' in results[0]:
            print(f"\n{'-'*60}")
            print("SAMPLE PERSONALIZED MESSAGE:")
            print(f"{'-'*60}")
            print(results[0]['personalized_message'])
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
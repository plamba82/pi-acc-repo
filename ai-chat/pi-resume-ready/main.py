#!/usr/bin/env python3
"""
AI Agent for Research Mentor Discovery and Personalized Outreach
"""

from contextlib import redirect_stdout
import os
import json
import asyncio
import logging
import sys
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path
from openai import AsyncOpenAI
import aiohttp
import time
from datetime import datetime

# CHANGE: Configurable model names via env with safe defaults for Chat Completions API.
PROFILE_MODEL = os.getenv("OPENAI_PROFILE_MODEL", "gpt-4o-mini")
PARSER_MODEL = os.getenv("OPENAI_PARSER_MODEL", "gpt-4o-mini")
MESSAGE_MODEL = os.getenv("OPENAI_MESSAGE_MODEL", "gpt-4o-mini")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@dataclass
class PersonProfile:
    """Data structure for person profile information"""
    name: str
    email: str
    university: str
    department: str
    research_areas: List[str] = None
    publications: List[str] = None
    expertise_level: str = ""
    mentorship_potential: str = ""
    contact_preference: str = ""
    
    def __post_init__(self):
        if self.research_areas is None:
            self.research_areas = []
        if self.publications is None:
            self.publications = []

@dataclass
class ResearchRequest:
    """Data structure for research project requirements"""
    student_level: str  # "junior" or "senior"
    research_topic: str
    duration: str
    skills_needed: List[str]
    timeline: str

class ResumeReader:
    """Handles reading and parsing resume content"""
    
    def __init__(self, resume_path: str = "resume.txt"):
        self.resume_path = Path(resume_path)
    
    def read_resume(self) -> str:
        """Read resume content from local file"""
        try:
            if not self.resume_path.exists():
                raise FileNotFoundError(f"Resume file not found: {self.resume_path}")
            
            with open(self.resume_path, 'r', encoding='utf-8') as file:
                content = file.read().strip()
                
            if not content:
                raise ValueError("Resume file is empty")
                
            logger.info(f"Successfully read resume from {self.resume_path}")
            return content
            
        except Exception as e:
            logger.error(f"Error reading resume: {e}")
            raise

def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` fences if present."""
    if not isinstance(text, str):
        return ""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned

class ProfileSearcher:
    """Handles LLM-based profile search and analysis"""
    
    def __init__(self, api_key: str):
        # CHANGE: Set client-level timeout instead of passing per-call unsupported timeout kwargs.
        self.client = AsyncOpenAI(api_key=api_key, timeout=30.0)
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=10)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def search_person_profile(self, person: PersonProfile) -> Dict[str, Any]:
        """Search for detailed profile information using LLM"""
        try:
            search_prompt = f"""
            Research and provide detailed insights about this academic professional:
            
            Name: {person.name}
            Email: {person.email}
            University: {person.university}
            Department: {person.department}
            
            Please provide:
            1. Research areas and expertise
            2. Recent publications or notable work
            3. Teaching/mentorship experience
            4. Suitability for mentoring high school students
            5. Preferred communication style
            6. Research project types they might be interested in
            7. Their potential availability for student mentorship
            
            Format the response as a structured analysis focusing on their value as a research mentor for high school students working on junior/senior projects.
            """
            
            # CHANGE: Use Chat Completions API correctly with 'messages' and 'model'.
            # chat = await self.client.chat.completions.create(
            #     model=PROFILE_MODEL,
            #     messages=[
            #         {"role": "system", "content": "You are an expert academic researcher and networking specialist. Provide detailed, accurate insights about academic professionals based on available information."},
            #         {"role": "user", "content": search_prompt}
            #     ],
            #     max_tokens=900,
            #     temperature=0.3
            # )
            # profile_insights_text = (chat.choices[0].message.content or "").strip()
            
            response = await self.client.responses.create(
                model="gpt-5-mini",
                input=[
                {"role": "system", "content": "You are an expert academic researcher and networking specialist. Provide detailed, accurate insights about academic professionals based on available information."},
                {"role": "user", "content": search_prompt}
                ],
                max_output_tokens=1500,
                # temperature=0.3
            )
            profile_insights_text = response.output_text
            
            # Parse insights into structured format
            structured_insights = await self._parse_profile_insights(profile_insights_text)
            
            logger.info(f"Successfully analyzed profile for {person.name}")
            return structured_insights
            
        except Exception as e:
            logger.error(f"Error searching profile for {person.name}: {e}")
            raise
    
    async def _parse_profile_insights(self, insights: str) -> Dict[str, Any]:
        """Parse LLM response into structured format"""
        try:
            parse_prompt = f"""
            Parse the following profile insights into a structured JSON format:
            
            {insights}
            
            Return a JSON object with these keys:
            - research_areas: array of research topics
            - publications: array of notable publications/work
            - mentorship_experience: string describing teaching/mentorship background
            - student_suitability: string rating (High/Medium/Low) with explanation
            - communication_style: string describing preferred communication
            - project_interests: array of project types they might mentor
            - availability_likelihood: string assessment of their availability
            - expertise_level: string (Expert/Advanced/Intermediate)
            """
            
            # CHANGE: Standardize to Chat Completions; return only JSON.
            chat = await self.client.chat.completions.create(
                model=PARSER_MODEL,
                messages=[
                    {"role": "system", "content": "You are a data parser. Return only valid JSON without any additional text or formatting."},
                    {"role": "user", "content": parse_prompt}
                ],
                max_tokens=600,
                temperature=0.1
            )
            content = (chat.choices[0].message.content or "").strip()
            json_text = _strip_code_fences(content)
            final_json = json.loads(json_text)
            return final_json;
            
        except Exception as e:
            logger.error(f"Error parsing profile insights: {e}")
            # Return default structure if parsing fails
            return {
                "research_areas": [],
                "publications": [],
                "mentorship_experience": "Information not available",
                "student_suitability": "Medium - Requires further assessment",
                "communication_style": "Professional academic communication",
                "project_interests": [],
                "availability_likelihood": "Unknown",
                "expertise_level": "Advanced"
            }

class MessagePersonalizer:
    """Handles personalized message generation"""
    
    def __init__(self, api_key: str):
        # CHANGE: Set client-level timeout.
        self.client = AsyncOpenAI(api_key=api_key, timeout=30.0)
    
    async def generate_personalized_message(
        self, 
        person: PersonProfile, 
        profile_insights: Dict[str, Any], 
        resume_content: str, 
        research_request: ResearchRequest
    ) -> str:
        """Generate personalized outreach message"""
        try:
            message_prompt = f"""
            Create a personalized, professional outreach email for a high school student seeking research mentorship.
            
            RECIPIENT PROFILE:
            Name: {person.name}
            University: {person.university}
            Department: {person.department}
            Research Areas: {', '.join(profile_insights.get('research_areas', []))}
            Mentorship Experience: {profile_insights.get('mentorship_experience', 'N/A')}
            Student Suitability: {profile_insights.get('student_suitability', 'N/A')}
            Communication Style: {profile_insights.get('communication_style', 'Professional')}
            
            STUDENT BACKGROUND (from resume):
            {resume_content}
            
            RESEARCH REQUEST:
            Student Level: {research_request.student_level}
            Research Topic: {research_request.research_topic}
            Duration: {research_request.duration}
            Skills Needed: {', '.join(research_request.skills_needed)}
            Timeline: {research_request.timeline}
            
            MANDATORY MESSAGE COMPONENTS (MUST BE INCLUDED EXACTLY):
            
            Opening: "I hope this message finds you well. My name is Krishiv Lamba, a rising junior at The School for the Talented and Gifted at Yvonne A. Ewell Townview Magnet Center. I am reaching out to express my interest in your research and to explore the possibility of working under your mentorship."
            
            Availability: "I am eager to apply these skills and my passion for combining technical skills with real-world impact to your research. I am available for 10-15 hours per week starting as soon as possible and can commit to a 6–12-month duration."
            
            Closing: "I would greatly appreciate the opportunity to discuss this opportunity and your work further. If it would be possible, could we arrange a meeting at your earliest convenience? I am flexible and can adjust to your schedule. Thank you for considering my request. I am looking forward to the possibility of learning from your expertise and contributing to your research."
            
            REQUIREMENTS:
            1. MUST start with the exact opening message provided above
            2. Include a personalized middle section that connects the student's background to the professor's research
            3. MUST include the exact availability statement provided above
            4. MUST end with the exact closing message provided above
            5. Professional yet approachable tone throughout
            6. Highlight relevant connections between student background and professor's expertise in the middle section
            7. Include appropriate subject line
            8. Total length should be 300-450 words
            
            Format as:
            Subject: [subject line]
            
            [email body with mandatory components]
            """
            
            # CHANGE: Use Chat Completions correctly (messages + max_tokens).
            chat = await self.client.chat.completions.create(
                model=MESSAGE_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert in academic communication and student mentorship. Create compelling, personalized outreach messages that include all mandatory components exactly as specified while maintaining professional quality."},
                    {"role": "user", "content": message_prompt}
                ],
                max_tokens=900,
                temperature=0.4
            )
            personalized_message = (chat.choices[0].message.content or "").strip()
            logger.info(f"Generated personalized message for {person.name}")
            return personalized_message
            
        except Exception as e:
            logger.error(f"Error generating message for {person.name}: {e}")
            raise

class ResearchMentorAgent:
    """Main AI agent orchestrating the research mentor discovery process"""
    
    def __init__(self, openai_api_key: str, resume_path: str = "resume.txt"):
        self.openai_api_key = openai_api_key
        self.resume_reader = ResumeReader(resume_path)
        self.resume_content = None
        
    async def initialize(self):
        """Initialize the agent by reading resume"""
        try:
            self.resume_content = self.resume_reader.read_resume()
            logger.info("Research Mentor Agent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            raise
    
    # CHANGE: Added method to load PersonProfile objects from JSON file
    def load_contacts_from_json(self, json_file_path: str) -> List[PersonProfile]:
        """Load multiple contacts from JSON file and convert to PersonProfile objects"""
        try:
            json_path = Path(json_file_path)
            if not json_path.exists():
                raise FileNotFoundError(f"JSON file not found: {json_file_path}")
            
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Handle both single object and array of objects
            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                raise ValueError("JSON file must contain an object or array of objects")
            
            contacts = []
            for i, contact_data in enumerate(data):
                try:
                    # Validate required fields
                    required_fields = ['name', 'email', 'university', 'department']
                    missing_fields = [field for field in required_fields if field not in contact_data]
                    if missing_fields:
                        raise ValueError(f"Missing required fields: {missing_fields}")
                    
                    contact = PersonProfile(
                        name=contact_data['name'],
                        email=contact_data['email'],
                        university=contact_data['university'],
                        department=contact_data['department'],
                        research_areas=contact_data.get('research_areas', []),
                        publications=contact_data.get('publications', []),
                        expertise_level=contact_data.get('expertise_level', ''),
                        mentorship_potential=contact_data.get('mentorship_potential', ''),
                        contact_preference=contact_data.get('contact_preference', '')
                    )
                    contacts.append(contact)
                    
                except Exception as e:
                    logger.error(f"Error processing contact {i+1}: {e}")
                    continue
            
            if not contacts:
                raise ValueError("No valid contacts found in JSON file")
            
            logger.info(f"Successfully loaded {len(contacts)} contacts from {json_file_path}")
            return contacts
            
        except Exception as e:
            logger.error(f"Error loading contacts from {json_file_path}: {e}")
            raise
    
    async def find_and_personalize_outreach(
        self, 
        person: PersonProfile, 
        research_request: ResearchRequest
    ) -> Dict[str, Any]:
        """Complete workflow: search profile and generate personalized message"""
        try:
            if not self.resume_content:
                await self.initialize()
            
            # Search for detailed profile information
            async with ProfileSearcher(self.openai_api_key) as searcher:
                profile_insights = await searcher.search_person_profile(person)
            
            # Generate personalized message
            personalizer = MessagePersonalizer(self.openai_api_key)
            personalized_message = await personalizer.generate_personalized_message(
                person, profile_insights, self.resume_content, research_request
            )
            
            # Compile results
            result = {
                "person_profile": {
                    "name": person.name,
                    "email": person.email,
                    "university": person.university,
                    "department": person.department
                },
                "profile_insights": profile_insights,
                "personalized_message": personalized_message,
                "research_request": {
                    "student_level": research_request.student_level,
                    "research_topic": research_request.research_topic,
                    "duration": research_request.duration,
                    "timeline": research_request.timeline
                },
                "generated_at": datetime.now().isoformat()
            }
            
            logger.info(f"Successfully completed outreach preparation for {person.name}")
            return result
            
        except Exception as e:
            logger.error(f"Error in find_and_personalize_outreach: {e}")
            raise
    
    async def batch_process_contacts(
        self, 
        contacts: List[PersonProfile], 
        research_request: ResearchRequest
    ) -> List[Dict[str, Any]]:
        """Process multiple contacts with rate limiting"""
        results = []
        for i, person in enumerate(contacts):
            try:
                logger.info(f"Processing contact {i+1}/{len(contacts)}: {person.name}")
                
                result = await self.find_and_personalize_outreach(person, research_request)
                results.append(result)
                
                # Rate limiting: wait between requests
                if i < len(contacts) - 1:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                logger.error(f"Failed to process {person.name}: {e}")
                # Continue with next contact
                results.append({
                    "person_profile": {
                        "name": person.name,
                        "email": person.email,
                        "university": person.university,
                        "department": person.department
                    },
                    "error": str(e),
                    "generated_at": datetime.now().isoformat()
                })
        
        return results

async def main():
    """Main entry point with example usage"""
    try:
        # Load API key from environment
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Initialize the agent
        agent = ResearchMentorAgent(api_key, "resume.txt")
        await agent.initialize()
        
        # CHANGE: Example of loading contacts from JSON file
        try:
            # Try to load contacts from JSON file first
            contacts = agent.load_contacts_from_json("contacts_example.json")
            print(f"Loaded {len(contacts)} contacts from JSON file")
            
            # Example research request
            research_request = ResearchRequest(
                student_level="junior",
                research_topic="Cell Biology and Cellular Energetics or Neuroscience or Bioinformatics and AI/Quantum Computing Applications in Biology or Molecular Biology and Protein Folding",
                duration="6-12 months",
                skills_needed=["lab work", "Data Analysis","Biology", "Research Writing"],
                timeline="Starting June 2026"
            )
            
            # Process all contacts from JSON
            results = await agent.batch_process_contacts(contacts, research_request)
            
            # Save batch results
            #output_file = f"batch_outreach_results_{len(contacts)}_contacts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
        except FileNotFoundError:
            # Fallback to single contact example if JSON file not found
            print("JSON file not found, using single contact example")
            
            person = PersonProfile(
                name="Dr. Jane Smith",
                email="jane.smith@university.edu",
                university="Stanford University",
                department="Computer Science"
            )
            
            research_request = ResearchRequest(
                student_level="junior",
                research_topic="Cell Biology and Cellular Energetics or Neuroscience or Bioinformatics and AI/Quantum Computing Applications in Biology or Molecular Biology and Protein Folding",
                duration="6-12 months",
                skills_needed=["lab work", "Data Analysis","Biology", "Research Writing"],
                timeline="Starting June 2026"
            )
            
            # Process single contact
            result = await agent.find_and_personalize_outreach(person, research_request)
            results = [result]
            
            # Save single result
            output_file = f"outreach_result_{person.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Save results to file
        # with open(output_file, 'w', encoding='utf-8') as f:
        #     json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"RESEARCH MENTOR OUTREACH GENERATED")
        print(f"{'='*60}")
        print(f"Contacts processed: {len(results)}")
        # print(f"Results saved to: {output_file}")
        
        # Display all results to a file while keeping stdout open
        if results:
            out_path = "results_output.txt"
            # CHANGE: keep all redirected prints inside the context so the file is open
            with open(out_path, "w", encoding="utf-8") as f, redirect_stdout(f):
                for idx, res in enumerate(results, start=1):
                    print(f"\n{'-'*60}")
                    print(f"RESULT {idx}/{len(results)}")
                    print(f"{'-'*60}")
                    if 'error' in res:
                        print(f"\n{'-'*60}")
                        print("ERROR DURING PROCESSING:")
                        print(f"{'-'*60}")
                        print(res['error'])
                        continue
                    person_profile = res.get('person_profile', {})
                    print(f"Contact: {person_profile.get('name', 'N/A')}")
                    print(f"Email: {person_profile.get('email', 'N/A')}")
                    print(f"University: {person_profile.get('university', 'N/A')}")
                    print(f"Department: {person_profile.get('department', 'N/A')}")
                    insights = res.get('profile_insights', {})
                    print(f"\nSuitability: {insights.get('student_suitability', 'N/A')}")
                    print(f"Expertise Level: {insights.get('expertise_level', 'N/A')}")
                    print(f"\n{'-'*60}")
                    print("PERSONALIZED MESSAGE:")
                    print(f"{'-'*60}")
                    print(res.get('personalized_message', 'N/A'))
                    # Back to console stdout here
                    print(f"\n{'-'*60}")
                    # print(f"Detailed results written to: {out_path}")
        else:
            print("No results to display.")
    except Exception as e:
        logger.error(f"Application error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
import google.generativeai as genai
from dotenv import load_dotenv
import os
import logging
import time

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def summarize_note(knowledge_piece: str) -> str:
    """
    Summarize a note using Google Gemini API
    """
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    
    genai.configure(api_key=api_key)
    
    generate_summary_prompt = "You are an excellent communication expert specializing in framing short crisp clear summaries out of a given knowledge piece."
    generate_summary_prompt += "\nYour task is to create a crystal clear, short and crisp summary from my given knowledge piece and summarize it in maximum 40 words so that it can be sent out as a reminder notification on my phone, increasing my recall and retention for that knowledge piece"
    generate_summary_prompt += "\nThink it like that when I read the sumarized information, it should provide me the whole context and the main learning crux from it, for my overall learning journey"
    generate_summary_prompt += "\nHere is the knowledge-piece/insight that you need to summarize - {}"
    generate_summary_prompt += "\nOutput Format: Crystal clear impactful top-down communication, like giving a quick insightful bite-sized lesson to me, covering the entire context wisely removing the need of me revisiting my notes. Don't write the preamble just the short, clear, crisp, contextualized, summarized response. Don't use markdown language instead uses capitals to emphasize"
    
    final_prompt = generate_summary_prompt.format(knowledge_piece)
    max_retries = 3
    model_choices = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"]
    attempt = 0

    for model in model_choices:
        attempt = 0
        while attempt < max_retries:
            try:
                model_instance = genai.GenerativeModel(model)
                response = model_instance.generate_content(final_prompt)
                logger.info(f"Summary generated for model {model}")
                return response.text
            except Exception as e:
                logger.error(f"Error generating summary for model {model}: {e}")
                attempt += 1
                delay = (2 ** (attempt-1))
                time.sleep(delay)
                continue
        
    logger.error(f"Failed to generate summary for all models")
    return None
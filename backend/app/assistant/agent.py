import os
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.google_cloud import GoogleCloudProvider
from app.config import settings
from app.assistant.deps import BusinessAgentDeps
from app.assistant.outputs import GroundedAnswer

# Load system instructions from instructions.md
current_dir = os.path.dirname(os.path.abspath(__file__))
instructions_path = os.path.join(current_dir, "instructions.md")
with open(instructions_path, "r") as f:
    instructions = f.read()

# Setup explicit Gemini model provider with the key from config or Google Cloud ADC fallback
is_placeholder = (
    not settings.GEMINI_API_KEY
    or "your-gemini-api-key" in settings.GEMINI_API_KEY.lower()
)

if is_placeholder:
    provider = GoogleCloudProvider(
        project=settings.GCP_PROJECT_ID,
        location=settings.GCP_LOCATION,
    )
else:
    provider = GoogleProvider(api_key=settings.GEMINI_API_KEY)

model = GoogleModel(settings.GEMINI_MODEL, provider=provider)

# Instantiate the grounded agent
agent = Agent(
    model,
    deps_type=BusinessAgentDeps,
    output_type=GroundedAnswer,
    system_prompt=instructions,
)

# Import tools to register their @agent.tool decorators with the agent instance
from app.assistant import tools  # noqa: F401, E402

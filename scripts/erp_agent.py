from __future__ import annotations

import asyncio
import datetime
import json
import logging
import os
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Literal, Optional

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
    llm,
)
from livekit.agents.multimodal import MultimodalAgent
from livekit.plugins import openai

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("erp-agent")
logger.setLevel(logging.INFO)

# Store conversation history
conversation_history = []

# Helper function to record speech
def record_speech(speaker: str, text: str) -> None:
    """Record a speech event in the conversation history."""
    if not text.strip():
        return  # Skip empty messages
    
    logger.info(f"RECORDING {speaker} SPEECH: {text}")
    conversation_history.append({
        "timestamp": datetime.datetime.now().isoformat(),
        "speaker": speaker,
        "text": text
    })

@dataclass
class SessionConfig:
    openai_api_key: str
    instructions: str
    voice: openai.realtime.api_proto.Voice
    temperature: float
    max_response_output_tokens: str | int
    modalities: list[openai.realtime.api_proto.Modality]
    turn_detection: openai.realtime.ServerVadOptions

    def __post_init__(self):
        if self.modalities is None:
            self.modalities = self._modalities_from_string("text_and_audio")

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if k != "openai_api_key"}

    @staticmethod
    def _modalities_from_string(modalities: str) -> list[str]:
        modalities_map = {
            "text_and_audio": ["text", "audio"],
            "text_only": ["text"],
        }
        return modalities_map.get(modalities, ["text", "audio"])

    def __eq__(self, other: SessionConfig) -> bool:
        return self.to_dict() == other.to_dict()


def parse_session_config(data: Dict[str, Any]) -> SessionConfig:
    # Use default config settings if no metadata provided
    if not data:
        logger.info("No session config provided, using defaults")
        return SessionConfig(
            openai_api_key=os.environ.get("OPENAI_API_KEY", ""),
            instructions=ERP_CONSULTANT_INSTRUCTIONS,
            voice="nova",
            temperature=0.85,
            max_response_output_tokens="inf",
            modalities=["text", "audio"],
            turn_detection=openai.realtime.ServerVadOptions(
                threshold=0.4,
                prefix_padding_ms=200,
                silence_duration_ms=500,
            )
        )

    turn_detection = None
    if data.get("turn_detection"):
        turn_detection_json = json.loads(data.get("turn_detection"))
        turn_detection = openai.realtime.ServerVadOptions(
            threshold=turn_detection_json.get("threshold", 0.4),
            prefix_padding_ms=turn_detection_json.get("prefix_padding_ms", 200),
            silence_duration_ms=turn_detection_json.get("silence_duration_ms", 500),
        )
    else:
        turn_detection = openai.realtime.ServerVadOptions(
            threshold=0.4,
            prefix_padding_ms=200,
            silence_duration_ms=500,
        )

    config = SessionConfig(
        openai_api_key=data.get("openai_api_key", os.environ.get("OPENAI_API_KEY", "")),
        instructions=data.get("instructions", ERP_CONSULTANT_INSTRUCTIONS),
        voice=data.get("voice", "nova"),
        temperature=float(data.get("temperature", 0.85)),
        max_response_output_tokens=data.get("max_output_tokens")
        if data.get("max_output_tokens") == "inf"
        else int(data.get("max_output_tokens") or "inf"),
        modalities=SessionConfig._modalities_from_string(
            data.get("modalities", "text_and_audio")
        ),
        turn_detection=turn_detection,
    )
    return config


# ERP consultant instructions
ERP_CONSULTANT_INSTRUCTIONS = """You are a technology consultant specializing in ERP system design. Your task is
to have a friendly conversation with the client, with the overall goal of
gathering all necessary information. You must obtain information about the
following points, but it's very important that the conversation feels natural,
and that you answer any question the customer has about how we work (you can
make up the details) and recommendations about the system.

When the user asks you to save a title for the conversation, use the saveTitle
tool to store their preferred title. For example, if they say "Please save this
conversation with the title 'ERP Planning for Acme Corp'", you should use the
tool to save that title.

When the user wants to end the conversation, use the finishConversation tool to
save the transcript and conclude the session. The user might say something like
"Let's finish our conversation" or "Please save our conversation".

Use un lenguaje y acento bien argentinos, con expresiones típicas locales."""


async def save_title(title: str) -> str:
    """Save the title of the conversation for future reference."""
    logger.info(f"\n=== TOOL CALLED: saveTitle ===")
    logger.info(f"Saving conversation title: '{title}'")
    logger.info(f"Current timestamp: {datetime.datetime.now().isoformat()}")
    logger.info("===============================\n")
    
    return f"Title '{title}' has been saved successfully for future reference."


async def finish_conversation(filename: Optional[str] = None) -> str:
    """Save the conversation transcript to a file and end the conversation."""
    logger.info(f"\n=== TOOL CALLED: finishConversation ===")
    
    # Create a default filename if not provided
    actual_filename = filename if filename else f"conversation-transcript-{int(datetime.datetime.now().timestamp()*1000)}.txt"
    file_path = os.path.join(os.getcwd(), actual_filename)
    
    # Format the transcript
    transcript = "CONVERSATION TRANSCRIPT\n"
    transcript += "=======================\n\n"
    transcript += f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    transcript += f"Total exchanges: {len(conversation_history)}\n\n"
    
    # Add conversation content
    for i, entry in enumerate(conversation_history):
        transcript += f"[{entry['timestamp']}] {entry['speaker']}: {entry['text']}\n"
        
        # Add a blank line between exchanges for readability
        if i < len(conversation_history) - 1 and entry['speaker'] != conversation_history[i+1]['speaker']:
            transcript += "\n"
    
    # Save the file
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(transcript)
        logger.info(f"Saved conversation transcript to: {file_path}")
        logger.info("===============================\n")
        
        return f"Conversation transcript has been saved to {actual_filename}. Thank you for using our ERP consultation service!"
    except Exception as e:
        logger.error(f"Error saving transcript: {e}")
        return "There was an error saving the transcript."


async def entrypoint(ctx: JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Wait for the user to join
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Start the multimodal agent
    run_multimodal_agent(ctx, participant)

    logger.info("agent started")
    
    # Stay alive until disconnected
    exit_event = asyncio.Event()
    await exit_event.wait()


def run_multimodal_agent(ctx: JobContext, participant: rtc.Participant):
    # Parse metadata for configuration or use defaults
    try:
        metadata = json.loads(participant.metadata) if participant.metadata else {}
    except:
        metadata = {}
    
    config = parse_session_config(metadata)
    logger.info(f"starting MultimodalAgent with config: {config.to_dict()}")

    if not config.openai_api_key:
        logger.error("OpenAI API Key is not provided")
        raise Exception("OpenAI API Key is required")

    # Following main.py example for function tools
    # Instead of creating our own functions, we register the functions directly
    
    model = openai.realtime.RealtimeModel(
        api_key=config.openai_api_key,
        instructions=config.instructions,
        voice=config.voice,
        temperature=config.temperature,
        max_response_output_tokens=config.max_response_output_tokens,
        modalities=config.modalities,
        turn_detection=config.turn_detection,
        input_audio_transcription={
            "model": "whisper-1"
        })#,
    """ functions=[
            {
                "name": "saveTitle",
                "description": "Save the title of the conversation for future reference",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "The title to save for this conversation"
                        }
                    },
                    "required": ["title"]
                }
            },
            {
                "name": "finishConversation",
                "description": "Save the conversation transcript to a file and end the conversation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "filename": {
                            "type": "string",
                            "description": "Optional custom filename for the transcript"
                        }
                    },
                    "required": []
                }
            }
        ]
     )"""
     
    
    assistant = MultimodalAgent(model=model)
    assistant.start(ctx.room)
    session = model.sessions[0]

    # Register function handlers
    @session.on("function_call.saveTitle")
    async def on_save_title(params):
        logger.info(f"Function call saveTitle with params: {params}")
        title = params.get("title", "Untitled")
        return await save_title(title)
    
    @session.on("function_call.finishConversation")
    async def on_finish_conversation(params):
        logger.info(f"Function call finishConversation with params: {params}")
        filename = params.get("filename")
        return await finish_conversation(filename)

    # Initial prompt to start the conversation
    if config.modalities == ["text", "audio"]:
        session.conversation.item.create(
            llm.ChatMessage(
                role="user",
                content="Inicia la conversación con una bienvenida breve y pregúntame en qué puedes ayudarme.",
            )
        )
        session.response.create()

    # Track transcriptions
    @session.on("input_speech_transcription_completed")
    def on_input_speech_transcription_completed(event: openai.realtime.InputTranscriptionCompleted):
        logger.info(f"User speech transcribed: {event.text}")
        record_speech("User", event.text)

    @session.on("response.content.text")
    def on_response_text(content):
        if hasattr(content, 'text') and content.text:
            logger.info(f"AI response text: {content.text}")
            record_speech("AI", content.text)

    @session.on("response_done")
    def on_response_done(response: openai.realtime.RealtimeResponse):
        # Check for response transcript
        try:
            if hasattr(response, 'transcript') and response.transcript:
                logger.info(f"Response transcript: {response.transcript}")
                record_speech("AI", response.transcript)
        except Exception as e:
            logger.error(f"Error processing response transcript: {e}")

    # Auto-save the transcript on room disconnection
    @ctx.room.on("disconnected")
    def on_disconnected():
        logger.info("Room disconnected")
        
        # Save transcript if we have content
        if conversation_history:
            filename = f"auto-saved-transcript-{int(datetime.datetime.now().timestamp()*1000)}.txt"
            file_path = os.path.join(os.getcwd(), filename)
            
            transcript = "AUTO-SAVED CONVERSATION TRANSCRIPT\n"
            transcript += "=================================\n\n"
            transcript += f"Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
            transcript += f"Room: {ctx.room.name}\n"
            transcript += f"Total exchanges: {len(conversation_history)}\n\n"
            
            for entry in conversation_history:
                transcript += f"[{entry['timestamp']}] {entry['speaker']}: {entry['text']}\n\n"
            
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(transcript)
                logger.info(f"Auto-saved conversation transcript to: {file_path}")
            except Exception as e:
                logger.error(f"Error auto-saving transcript: {e}")


if __name__ == "__main__":
    # Configure logging to display more information
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Ensure we have the OpenAI API key
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY environment variable not set")
        
    # Configure worker options
    options = WorkerOptions(
        entrypoint_fnc=entrypoint, 
        worker_type=WorkerType.ROOM,
        api_key=os.environ.get("LIVEKIT_API_KEY", "devkey"),
        api_secret=os.environ.get("LIVEKIT_API_SECRET", "devsecret"),
        ws_url=os.environ.get("LIVEKIT_URL", "ws://localhost:7880"),
    )
    
    # Run the agent
    logger.info("Starting ERP Consultant Agent")
    cli.run_app(options)

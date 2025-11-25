"""
Base agent class for Telivus AI health agents.

Provides common functionality and interfaces for all health-related AI agents.
"""

from typing import Dict, List, Any, Optional
from abc import ABC, abstractmethod
import logging

from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import BaseMessage
from langchain.memory import ConversationBufferWindowMemory
from langchain.tools import BaseTool

from app.core.config import settings
from app.core.logging import get_logger

# Get logger
logger = get_logger(__name__)


class BaseHealthAgent(ABC):
    """
    Base class for all health-related AI agents.

    Provides common functionality like LLM initialization, memory management,
    and tool integration.
    """

    def __init__(
        self,
        agent_name: str,
        system_prompt: str,
        tools: Optional[List[BaseTool]] = None,
        memory_window: int = 10
    ):
        """
        Initialize the health agent.

        Args:
            agent_name: Name of the agent
            system_prompt: System prompt for the agent
            tools: List of tools available to the agent
            memory_window: Number of messages to keep in memory
        """
        self.agent_name = agent_name
        self.system_prompt = system_prompt
        self.tools = tools or []

        # Initialize LLM
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            openai_api_key=settings.OPENAI_API_KEY
        )

        # Initialize memory
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            k=memory_window
        )

        # Create prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        # Create agent
        self.agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.prompt
        )

        # Create agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=settings.DEBUG,
            handle_parsing_errors=True,
            max_iterations=5,
            max_execution_time=30
        )

        logger.info(f"Initialized {agent_name} agent")

    @abstractmethod
    async def process_request(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a request using the agent.

        Args:
            input_data: Input data for processing

        Returns:
            Dict containing the agent's response
        """
        pass

    async def _execute_agent(self, input_text: str, **kwargs) -> str:
        """
        Execute the agent with given input.

        Args:
            input_text: Input text for the agent
            **kwargs: Additional parameters

        Returns:
            Agent's response as string
        """
        try:
            response = await self.agent_executor.ainvoke({
                "input": input_text,
                **kwargs
            })

            result = response.get("output", "")
            logger.info(f"{self.agent_name} processed request successfully")
            return result

        except Exception as e:
            logger.error(f"Error executing {self.agent_name}: {e}")
            return f"I apologize, but I encountered an error processing your request. Please try again."

    def add_to_memory(self, human_message: str, ai_message: str) -> None:
        """
        Add a conversation turn to memory.

        Args:
            human_message: User's message
            ai_message: AI's response
        """
        self.memory.chat_memory.add_user_message(human_message)
        self.memory.chat_memory.add_ai_message(ai_message)

    def clear_memory(self) -> None:
        """Clear the agent's memory."""
        self.memory.clear()
        logger.info(f"Cleared memory for {self.agent_name}")

    def get_memory_summary(self) -> str:
        """Get a summary of the conversation memory."""
        messages = self.memory.chat_memory.messages
        if not messages:
            return "No conversation history"

        summary = f"Conversation with {len(messages)//2} exchanges"
        return summary

    async def validate_health_context(self, context: Dict[str, Any]) -> bool:
        """
        Validate that the context contains appropriate health-related information.

        Args:
            context: Context dictionary to validate

        Returns:
            True if context is valid for health processing
        """
        # Basic validation - can be extended
        required_fields = ['symptoms', 'age']
        for field in required_fields:
            if field not in context:
                logger.warning(f"Missing required field: {field}")
                return False

        # Validate age range
        age = context.get('age', 0)
        if not (0 <= age <= 130):
            logger.warning(f"Invalid age: {age}")
            return False

        return True
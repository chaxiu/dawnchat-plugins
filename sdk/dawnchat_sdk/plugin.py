"""
DawnChat Plugin SDK - Base Plugin Class

Provides the base class for all DawnChat plugins.
"""

from abc import ABC, abstractmethod
from typing import Optional, Any
import logging

logger = logging.getLogger("dawnchat_sdk")


class BasePlugin(ABC):
    """
    Base class for DawnChat plugins.
    
    All plugins should inherit from this class and implement
    the required lifecycle methods.
    
    Example:
        class MyPlugin(BasePlugin):
            async def on_start(self):
                print("Plugin started!")
            
            async def on_stop(self):
                print("Plugin stopped!")
    """
    
    def __init__(self):
        self._plugin_id: Optional[str] = None
        self._host_port: Optional[int] = None
        self._is_running: bool = False
        self._config: dict = {}
    
    @property
    def plugin_id(self) -> Optional[str]:
        """Get the plugin ID assigned by the Host."""
        return self._plugin_id
    
    @property
    def is_running(self) -> bool:
        """Check if the plugin is currently running."""
        return self._is_running
    
    @property
    def config(self) -> dict:
        """Get the plugin configuration."""
        return self._config
    
    def configure(
        self,
        plugin_id: str,
        host_port: int,
        config: Optional[dict] = None,
    ) -> None:
        """
        Configure the plugin with Host-provided settings.
        
        This is called by the Host before on_start().
        
        Args:
            plugin_id: Unique identifier for this plugin instance
            host_port: Port where the Host API is available
            config: Optional configuration dictionary
        """
        self._plugin_id = plugin_id
        self._host_port = host_port
        self._config = config or {}
        logger.info(f"Plugin configured: {plugin_id}")
    
    async def start(self) -> None:
        """
        Start the plugin.
        
        This is called by the Host to start the plugin.
        It invokes on_start() and sets the running state.
        """
        if self._is_running:
            logger.warning("Plugin is already running")
            return
        
        logger.info(f"Starting plugin: {self._plugin_id}")
        await self.on_start()
        self._is_running = True
        logger.info(f"Plugin started: {self._plugin_id}")
    
    async def stop(self) -> None:
        """
        Stop the plugin.
        
        This is called by the Host to stop the plugin.
        It invokes on_stop() and clears the running state.
        """
        if not self._is_running:
            logger.warning("Plugin is not running")
            return
        
        logger.info(f"Stopping plugin: {self._plugin_id}")
        await self.on_stop()
        self._is_running = False
        logger.info(f"Plugin stopped: {self._plugin_id}")
    
    @abstractmethod
    async def on_start(self) -> None:
        """
        Called when the plugin starts.
        
        Override this method to perform initialization tasks.
        """
        pass
    
    @abstractmethod
    async def on_stop(self) -> None:
        """
        Called when the plugin stops.
        
        Override this method to perform cleanup tasks.
        """
        pass
    
    async def on_config_change(self, new_config: dict) -> None:
        """
        Called when the plugin configuration changes.
        
        Override this method to handle configuration updates.
        
        Args:
            new_config: The new configuration dictionary
        """
        self._config = new_config
    
    async def handle_command(self, command: str, args: dict) -> Any:
        """
        Handle a command from the Host or user.
        
        Override this method to handle custom commands.
        
        Args:
            command: The command name
            args: Command arguments
        
        Returns:
            The command result (will be serialized to JSON)
        """
        raise NotImplementedError(f"Command not implemented: {command}")


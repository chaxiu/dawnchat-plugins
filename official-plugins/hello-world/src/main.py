"""
Hello World Plugin - Entry Point

This module starts the plugin HTTP server (Gradio) and communicates
with the DawnChat Host.
"""

import sys
import json
import argparse
from pathlib import Path


def print_ready_message(port: int) -> None:
    """
    Print a JSON message indicating the plugin is ready.
    
    The Host process parses this message to know:
    1. The plugin has successfully started
    2. The port it's listening on
    """
    ready_msg = {
        "status": "ready",
        "port": port,
        "protocol": "gradio",
        "message": "Hello World plugin is ready",
    }
    # Use stderr for status messages, stdout may be used for other purposes
    print(json.dumps(ready_msg), file=sys.stderr, flush=True)


def main() -> None:
    """Main entry point for the plugin."""
    parser = argparse.ArgumentParser(description="Hello World Plugin for DawnChat")
    parser.add_argument(
        "--port",
        type=int,
        default=7861,
        help="Port to run the Gradio server on (default: 7861)",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to bind the server to (default: 127.0.0.1)",
    )
    args = parser.parse_args()
    
    # Import the app module
    from app import create_app
    
    # Create the Gradio app
    app = create_app()
    
    # Print ready message before launching
    # Note: Gradio's launch() is blocking, so we print before
    print_ready_message(args.port)
    
    # Launch the Gradio server
    # - prevent_thread_lock=False keeps the main thread running
    # - show_error=True displays errors in the UI
    # - quiet=True reduces console output
    app.launch(
        server_name=args.host,
        server_port=args.port,
        share=False,  # Don't create a public URL
        show_error=True,
        quiet=True,  # Reduce Gradio's console output
        prevent_thread_lock=False,  # Keep main thread running
    )


if __name__ == "__main__":
    main()


"""
Hello World Plugin - Gradio App

A simple Gradio interface demonstrating the DawnChat Plugin Platform.
"""

import gradio as gr
import gradio.themes as gr_themes


def greet(name: str, greeting_style: str = "friendly") -> str:
    """Generate a greeting message based on the name and style."""
    if not name.strip():
        return "👋 Please enter your name!"
    
    greetings = {
        "friendly": f"Hello, {name}! 👋 Welcome to DawnChat Plugin Platform!",
        "formal": f"Good day, {name}. It is a pleasure to meet you.",
        "casual": f"Hey {name}! What's up? 🎉",
        "enthusiastic": f"WOW! {name}! SO GREAT TO MEET YOU! 🚀🎊✨",
    }
    
    return greetings.get(greeting_style, greetings["friendly"])


def reverse_text(text: str) -> str:
    """Reverse the input text."""
    if not text.strip():
        return "Please enter some text to reverse!"
    return text[::-1]


def count_stats(text: str) -> str:
    """Count characters, words, and lines in the text."""
    if not text.strip():
        return "Please enter some text to analyze!"
    
    char_count = len(text)
    word_count = len(text.split())
    line_count = len(text.splitlines())
    
    return f"""📊 Text Statistics:
- Characters: {char_count}
- Words: {word_count}
- Lines: {line_count}"""


def create_app() -> gr.Blocks:
    """Create and return the Gradio Blocks app."""
    
    with gr.Blocks(
        title="Hello World - DawnChat Plugin",
        theme=gr_themes.Soft(),
    ) as app:
        gr.Markdown(
            """
            # 👋 Hello World Plugin
            
            Welcome to the DawnChat Plugin Platform! This is a simple demo plugin 
            showcasing the Gradio integration capabilities.
            """
        )
        
        with gr.Tabs():
            # Tab 1: Greeting
            with gr.TabItem("🎉 Greeting"):
                gr.Markdown("### Enter your name to receive a personalized greeting!")
                
                with gr.Row():
                    name_input = gr.Textbox(
                        label="Your Name",
                        placeholder="Enter your name here...",
                        scale=2,
                    )
                    style_dropdown = gr.Dropdown(
                        choices=["friendly", "formal", "casual", "enthusiastic"],
                        value="friendly",
                        label="Greeting Style",
                        scale=1,
                    )
                
                greet_btn = gr.Button("Say Hello! 👋", variant="primary")
                greeting_output = gr.Textbox(
                    label="Greeting",
                    interactive=False,
                )
                
                greet_btn.click(
                    fn=greet,
                    inputs=[name_input, style_dropdown],
                    outputs=greeting_output,
                )
            
            # Tab 2: Text Tools
            with gr.TabItem("🔧 Text Tools"):
                gr.Markdown("### Simple text manipulation tools")
                
                text_input = gr.Textbox(
                    label="Input Text",
                    placeholder="Enter some text...",
                    lines=3,
                )
                
                with gr.Row():
                    reverse_btn = gr.Button("🔄 Reverse Text")
                    stats_btn = gr.Button("📊 Count Stats")
                
                tool_output = gr.Textbox(
                    label="Result",
                    interactive=False,
                    lines=4,
                )
                
                reverse_btn.click(
                    fn=reverse_text,
                    inputs=text_input,
                    outputs=tool_output,
                )
                stats_btn.click(
                    fn=count_stats,
                    inputs=text_input,
                    outputs=tool_output,
                )
            
            # Tab 3: About
            with gr.TabItem("ℹ️ About"):
                gr.Markdown(
                    """
                    ### About This Plugin
                    
                    This is a demonstration plugin for the **DawnChat Plugin Platform**.
                    
                    **Features:**
                    - 🎉 Personalized greetings with multiple styles
                    - 🔄 Text reversal tool
                    - 📊 Text statistics counter
                    
                    **Technical Details:**
                    - Built with Gradio 4.x
                    - Runs as an isolated plugin process
                    - Communicates with DawnChat Host via HTTP
                    
                    ---
                    
                    *Version: 1.0.0*  
                    *Author: DawnChat Team*
                    """
                )
    
    return app


# For direct execution (development/testing)
if __name__ == "__main__":
    import argparse
    import json
    import sys
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7860)
    args = parser.parse_args()
    
    app = create_app()
    app.launch(
        server_name=args.host,
        server_port=args.port,
        prevent_thread_lock=True
    )
    
    # Signal ready to PluginManager
    print(json.dumps({"status": "ready"}), file=sys.stderr, flush=True)
    
    app.block_thread()

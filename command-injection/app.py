#!/usr/bin/env python3


from flask import Flask, request, render_template_string
import subprocess

app = Flask(__name__)

# Simple HTML template for the web interface
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Vulnerable Command Executor</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .warning { background-color: #ffebee; border: 1px solid #f44336; padding: 10px; margin: 20px 0; }
        .container { max-width: 800px; margin: 0 auto; }
        textarea { width: 100%; height: 100px; }
        .output { background-color: #f5f5f5; padding: 15px; border: 1px solid #ddd; margin-top: 20px; }
        .output pre { margin: 0; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Command Executor</h1>

        <div class="warning">
            <strong>⚠️ WARNING:</strong> This application is intentionally vulnerable to command injection.
        </div>

        <form method="POST">
            <h3>Enter a command to execute:</h3>
            <textarea name="command" placeholder="ls -la">{{ command or '' }}</textarea>
            <br><br>
            <input type="submit" value="Execute Command">
        </form>

        {% if output is defined %}
        <div class="output">
            <h3>Command Output:</h3>
            <pre>{{ output }}</pre>
        </div>
        {% endif %}

        <div style="margin-top: 40px;">
            <h3>Example Commands to Try:</h3>
            <ul>
                <li><code>ls -la</code> - List files</li>
                <li><code>whoami</code> - Show current user</li>
                <li><code>pwd</code> - Show current directory</li>
                <li><code>cat /etc/passwd</code> - Read system file (if accessible)</li>
            </ul>

            <h3>Command Injection Examples:</h3>
            <ul>
                <li><code>ls; whoami</code> - Execute multiple commands</li>
                <li><code>ls && echo "Injected command"</code> - Chain commands</li>
                <li><code>ls | grep "txt"</code> - Pipe output</li>
                <li><code>ls; cat /etc/hosts</code> - Read sensitive files</li>
            </ul>
        </div>
    </div>
</body>
</html>
"""


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        # VULNERABLE: Direct execution of user input without sanitization
        user_command = request.form.get("command", "")

        if user_command:
            try:
                # This is the vulnerable line - directly executing user input
                # Using shell=True makes it even more dangerous
                result = subprocess.run(
                    user_command,
                    shell=True,  # DANGEROUS: Allows command injection
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

                # Combine stdout and stderr
                output = result.stdout
                if result.stderr:
                    output += f"\n--- STDERR ---\n{result.stderr}"

                if result.returncode != 0:
                    output += f"\n--- Return Code: {result.returncode} ---"

            except subprocess.TimeoutExpired:
                output = "Command timed out after 10 seconds"
            except Exception as e:
                output = f"Error executing command: {str(e)}"
        else:
            output = "No command provided"

        return render_template_string(
            HTML_TEMPLATE, command=user_command, output=output
        )

    return render_template_string(HTML_TEMPLATE)


@app.route("/health")
def health():
    """Simple health check endpoint"""
    return {"status": "running", "warning": "This app is intentionally vulnerable!"}


if __name__ == "__main__":
    # Run the app
    app.run(
        host="127.0.0.1",  # Only bind to localhost for safety
        port=5000,
        debug=True,  # Shows detailed error pages
    )

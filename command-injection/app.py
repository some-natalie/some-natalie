#!/usr/bin/env python3


from flask import Flask, request, render_template
import subprocess

app = Flask(__name__)


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

        return render_template("index.html", command=user_command, output=output)

    return render_template("index.html")


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

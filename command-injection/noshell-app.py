#!/usr/bin/env python3


from flask import Flask, request, render_template
import io
import contextlib
import traceback

app = Flask(__name__)


def execute_python_code(code):
    """
    Execute Python code with full access to Python capabilities.
    """
    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    try:
        # Redirect stdout and stderr to capture output
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            # Execute the code with full access
            exec(code)

        # Get the captured output
        stdout_output = stdout_capture.getvalue()
        stderr_output = stderr_capture.getvalue()

        # Combine outputs
        output = ""
        if stdout_output:
            output += stdout_output
        if stderr_output:
            if output:
                output += "\n--- STDERR ---\n"
            output += stderr_output

        return output if output else "Code executed successfully (no output)"

    except SyntaxError as e:
        return f"Syntax Error: {str(e)}"
    except Exception as e:
        # Capture the full traceback
        error_traceback = traceback.format_exc()
        return f"Runtime Error: {str(e)}\n\nFull traceback:\n{error_traceback}"


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        user_code = request.form.get("command", "")

        if user_code:
            try:
                output = execute_python_code(user_code)
            except Exception as e:
                output = f"Unexpected error: {str(e)}"
        else:
            output = "No Python code provided"

        return render_template("python.html", command=user_code, output=output)

    return render_template("python.html")


@app.route("/health")
def health():
    """Simple health check endpoint"""
    return {"status": "running", "warning": "This app executes arbitrary Python code!"}


if __name__ == "__main__":
    # Run the app
    app.run(
        host="127.0.0.1",  # Only bind to localhost for safety
        port=5000,
        debug=True,  # Shows detailed error pages
    )

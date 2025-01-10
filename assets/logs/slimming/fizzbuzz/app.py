#!/usr/bin/env python3

"""
This is a quick and dirty webhook receiver that will add an entry to a database
based on the webhook payload.
"""

# Imports
from datetime import datetime
from flask import Flask, request, render_template
from src import fizzbuzz


# Make instance of flask app
app = Flask(__name__)


# fizzbuzz
@app.route("/", methods=["GET", "POST"])
def index():
    result = "?"

    if request.method == "POST":
        if not fizzbuzz.is_number(request.form.get("number")):
            return render_template("fizzbuzz.html", result="not a number")
        number = int(request.form.get("number"))
        result = fizzbuzz.run_fizzbuzz(number)

    return render_template("fizzbuzz.html", result=result)

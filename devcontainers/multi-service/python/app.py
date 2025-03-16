#!/usr/bin/env python3

"""
This is a quick and dirty webhook receiver that will add an entry to a database
based on the webhook payload.
"""

# Imports
import psycopg2
from datetime import datetime
from flask import Flask, request, Response

# Make instance of flask app
app = Flask(__name__)

# Write the username and repo to the test table
def write_to_db(username, repo):
    """
    Writes the username, repo, and time to the test table
    """
    conn = psycopg2.connect(
        "host=database dbname=webhooks user=postgres password=mysecretpassword"
    )
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO test_webhook (username, target_repo, event_timestamp) 
            VALUES (%s, %s, %s);
            """,
            (username, repo, datetime.now()),
        )
    except psycopg2.Error as e:
        print("Error: %s", e)
    conn.commit()
    cur.close()
    conn.close()

def display():
    conn = psycopg2.connect(
        "host=database dbname=webhooks user=postgres password=mysecretpassword"
    )
    cur = conn.cursor()
    cur.execute(
        """
        SELECT username, target_repo, event_timestamp 
        FROM test_webhook 
        ORDER BY event_timestamp DESC 
        LIMIT 5;
        """
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return str(rows)

def status():
    return """
    <html>
    <head>
        <title>Webhook Receiver</title>
    </head>
    <body>
        <h2>Webhook Receiver</h2>
        <p>POST requests to /webhook</p>
        <p>GET requests to <a href=/latest>/latest</a></p>
    </body>
    </html>
    """

# Do the things
@app.route("/webhook", methods=["POST"])
def respond():
    username = request.json["repository"]["owner"]["login"]
    repo = request.json["repository"]["name"]
    write_to_db(username, repo)
    return Response(status=201)

@app.route("/latest", methods=["GET"])
def latest():
    return Response(display(), status=200)

@app.route("/", methods=["GET"])
def health():
    return Response(status(), status=200)

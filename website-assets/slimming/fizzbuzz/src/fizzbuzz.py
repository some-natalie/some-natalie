#!/usr/bin/env python3

"""
fizzbuzz in flask
"""


# the classic fizzbuzz
def run_fizzbuzz(number):
    """
    fizzbuzz function
    """
    if number % 3 == 0 and number % 5 == 0:
        return "fizzbuzz"
    elif number % 3 == 0:
        return "fizz"
    elif number % 5 == 0:
        return "buzz"
    else:
        return "no fizzbuzz for you!"


# make sure input is a number
def is_number(number):
    """
    make sure it's an integer
    """
    try:
        int(number)
        return True
    except ValueError:
        return False

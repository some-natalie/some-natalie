# an updated benchmark script for local ai models

shamelessly updated this <https://github.com/MinhNgyuen/llm-benchmark> to use uv, updated dependencies, etc.

## usage

```shell
uv run main.py \
    --verbose \
    --skip-models gpt-oss:20b llama2:latest \
    --prompts 'Why is the sky blue?' 'Explain why there's day and night like I'm 5 years old.'
```

## example output

```shell
$ uv run main.py --verbose --prompts "why is the sky blue?"

Verbose: True
Skip models: []
Prompts: ['why is the sky blue?']
Evaluating models: ['gpt-oss:20b']



Benchmarking: gpt-oss:20b
Prompt: why is the sky blue?

:: RESPONSE OMITTED FOR LENGTH :: 

Response: 

----------------------------------------------------
        gpt-oss:20b
            Prompt eval: 174.56 t/s
            Response: 8.22 t/s
            Total: 9.06 t/s

        Stats:
            Prompt tokens: 73
            Response tokens: 679
            Model load time: 0.19s
            Prompt eval time: 0.42s
            Response time: 82.58s
            Total time: 83.48s
----------------------------------------------------
        
Average stats:

----------------------------------------------------
        gpt-oss:20b
            Prompt eval: 174.56 t/s
            Response: 8.22 t/s
            Total: 9.06 t/s

        Stats:
            Prompt tokens: 73
            Response tokens: 679
            Model load time: 0.19s
            Prompt eval time: 0.42s
            Response time: 82.58s
            Total time: 83.48s
----------------------------------------------------
```

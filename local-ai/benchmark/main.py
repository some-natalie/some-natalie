import argparse
from datetime import datetime
from typing import List

import ollama
from pydantic import (
    BaseModel,
    Field,
    field_validator,
)


class Message(BaseModel):
    role: str
    content: str


class OllamaResponse(BaseModel):
    model: str
    created_at: datetime
    message: Message
    done: bool
    total_duration: int
    load_duration: int = 0
    prompt_eval_count: int = Field(-1, validate_default=True)
    prompt_eval_duration: int
    eval_count: int
    eval_duration: int

    @field_validator("prompt_eval_count")
    @classmethod
    def validate_prompt_eval_count(cls, value: int) -> int:
        if value == -1:
            print(
                "\nWarning: prompt token count was not provided, potentially due to prompt caching. For more info, see https://github.com/ollama/ollama/issues/2068\n"
            )
            return 0  # Set default value
        return value


def run_benchmark(model_name: str, prompt: str, verbose: bool) -> OllamaResponse:

    last_element = None

    if verbose:
        stream = ollama.chat(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            stream=True,
        )
        for chunk in stream:
            print(chunk["message"]["content"], end="", flush=True)
            last_element = chunk
    else:
        last_element = ollama.chat(
            model=model_name,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

    if not last_element:
        raise RuntimeError("System Error: No response received from ollama")

    # with open("data/ollama/ollama_res.json", "w") as outfile:
    #     outfile.write(json.dumps(last_element, indent=4))

    # Convert ChatResponse to OllamaResponse by extracting fields
    if hasattr(last_element, "model") and hasattr(last_element, "message"):
        return OllamaResponse(
            model=getattr(last_element, "model", ""),
            created_at=datetime.now(),
            message=Message(
                role=getattr(last_element.message, "role", ""),
                content=getattr(last_element.message, "content", ""),
            ),
            done=getattr(last_element, "done", True),
            total_duration=getattr(last_element, "total_duration", 0),
            load_duration=getattr(last_element, "load_duration", 0),
            prompt_eval_count=getattr(last_element, "prompt_eval_count", -1),
            prompt_eval_duration=getattr(last_element, "prompt_eval_duration", 0),
            eval_count=getattr(last_element, "eval_count", 0),
            eval_duration=getattr(last_element, "eval_duration", 0),
        )
    else:
        return OllamaResponse.model_validate(last_element)


def nanosec_to_sec(nanosec):
    return nanosec / 1000000000


def inference_stats(model_response: OllamaResponse):
    # Use properties for calculations
    prompt_ts = model_response.prompt_eval_count / (
        nanosec_to_sec(model_response.prompt_eval_duration)
    )
    response_ts = model_response.eval_count / (
        nanosec_to_sec(model_response.eval_duration)
    )
    total_ts = (model_response.prompt_eval_count + model_response.eval_count) / (
        nanosec_to_sec(
            model_response.prompt_eval_duration + model_response.eval_duration
        )
    )

    print(f"""
----------------------------------------------------
        {model_response.model}
            Prompt eval: {prompt_ts:.2f} t/s
            Response: {response_ts:.2f} t/s
            Total: {total_ts:.2f} t/s

        Stats:
            Prompt tokens: {model_response.prompt_eval_count}
            Response tokens: {model_response.eval_count}
            Model load time: {nanosec_to_sec(model_response.load_duration):.2f}s
            Prompt eval time: {nanosec_to_sec(model_response.prompt_eval_duration):.2f}s
            Response time: {nanosec_to_sec(model_response.eval_duration):.2f}s
            Total time: {nanosec_to_sec(model_response.total_duration):.2f}s
----------------------------------------------------
        """)


def average_stats(responses: List[OllamaResponse]):
    if len(responses) == 0:
        print("No stats to average")
        return

    res = OllamaResponse(
        model=responses[0].model,
        created_at=datetime.now(),
        message=Message(
            role="system",
            content=f"Average stats across {len(responses)} runs",
        ),
        done=True,
        total_duration=sum(r.total_duration for r in responses),
        load_duration=sum(r.load_duration for r in responses),
        prompt_eval_count=sum(r.prompt_eval_count for r in responses),
        prompt_eval_duration=sum(r.prompt_eval_duration for r in responses),
        eval_count=sum(r.eval_count for r in responses),
        eval_duration=sum(r.eval_duration for r in responses),
    )
    print("Average stats:")
    inference_stats(res)


def get_benchmark_models(skip_models: List[str] = []) -> List[str]:
    models = ollama.list().get("models", [])
    model_names = [model["model"] for model in models]
    if len(skip_models) > 0:
        model_names = [model for model in model_names if model not in skip_models]
    print(f"Evaluating models: {model_names}\n")
    return model_names


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Run benchmarks on your Ollama models.\n\n"
            "Example usage:\n"
            "  uv run main.py \\\n"
            "    --verbose \\\n"
            "    --skip-models gpt-oss:20b llama2:latest \\\n"
            "    --prompts 'Why is the sky blue?' 'Explain why there's day and night like I'm 5 years old.'"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Increase output verbosity",
        default=False,
    )
    parser.add_argument(
        "-s",
        "--skip-models",
        nargs="*",
        default=[],
        help="List of model names to skip. Separate multiple models with spaces.",
    )
    parser.add_argument(
        "-p",
        "--prompts",
        nargs="*",
        default=[
            "Why is the sky blue?",
            "Explain why there's day and night like I'm 5 years old.",
        ],
        help="List of prompts to use for benchmarking. Separate multiple prompts with spaces.",
    )

    args = parser.parse_args()

    verbose = args.verbose
    skip_models = args.skip_models
    prompts = args.prompts
    print(f"\nVerbose: {verbose}\nSkip models: {skip_models}\nPrompts: {prompts}")

    model_names = get_benchmark_models(skip_models)
    benchmarks = {}

    for model_name in model_names:
        responses: List[OllamaResponse] = []
        for prompt in prompts:
            if verbose:
                print(f"\n\nBenchmarking: {model_name}\nPrompt: {prompt}")
            response = run_benchmark(model_name, prompt, verbose=verbose)
            responses.append(response)

            if verbose:
                print(f"\n\nResponse: {response.message.content}")
                inference_stats(response)
        benchmarks[model_name] = responses

    for model_name, responses in benchmarks.items():
        average_stats(responses)


if __name__ == "__main__":
    main()

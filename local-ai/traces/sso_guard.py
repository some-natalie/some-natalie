#!/usr/bin/env python3
"""Turn an expired AWS SSO session into a legible 403 instead of a retried 500.

When the SSO token in ~/.aws/sso lapses, botocore raises TokenRetrievalError deep inside
the bedrock call. litellm maps that to a 500, and a 500 is exactly what Claude Code (and
anything else with a retry policy) treats as "try again in a moment" — so the CLI spins
silently through its backoff schedule and the only visible symptom is a wall of red Error
rows in Langfuse an hour later.

This hook checks the credentials before the request is dispatched and rejects it with a
403 naming the `aws sso login` command to run. 403 is deliberate: it is not in anyone's
retry set, so it surfaces on the first attempt instead of the tenth.

Only bedrock-backed deployments are gated. ollama models keep serving while the SSO
session is dead, which is the whole point of having them.

Nothing here needs a litellm restart to recover: botocore re-reads the token cache from
disk on each refresh, and the cached credentials object is dropped on failure so the next
request rebuilds the whole chain from scratch.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import botocore.exceptions
import botocore.session
from litellm.integrations.custom_logger import CustomLogger
from litellm.proxy._types import UserAPIKeyAuth

# The botocore exceptions that all mean "the human needs to re-auth in a browser". Every
# other exception is left alone: a transient STS blip should not be reported as an expired
# session, and a genuinely broken config should surface as the 500 it is.
_EXPIRED: tuple[type[Exception], ...] = (
    botocore.exceptions.TokenRetrievalError,
    botocore.exceptions.UnauthorizedSSOTokenError,
    botocore.exceptions.SSOTokenLoadError,
)


def _sso_start_url(session: botocore.session.Session, profile: str) -> str | None:
    """The browser URL for `profile`'s sso-session, for the operator to eyeball."""
    config = session.full_config
    sso_session = config.get("profiles", {}).get(profile, {}).get("sso_session")
    if sso_session is None:
        return None
    return config.get("sso_sessions", {}).get(sso_session, {}).get("sso_start_url")


class SSOGuard(CustomLogger):
    """Pre-call hook rejecting bedrock requests when the SSO session has lapsed."""

    def __init__(self) -> None:
        super().__init__()
        self._profile = os.environ.get("AWS_PROFILE") or ""
        # Cached across requests so the ~500ms cold credential resolve is paid once, not
        # per request. botocore's own DeferredRefreshableCredentials handles the refresh
        # window from here; a warm check costs microseconds.
        self._credentials: Any = None
        self._start_url: str | None = None

    def _check(self) -> str | None:
        """None if credentials resolve, else the message to hand back to the operator.

        Runs in a worker thread — a cold resolve or a token refresh does network I/O and
        would otherwise stall the proxy's event loop for every other in-flight request.
        """
        try:
            if self._credentials is None:
                session = botocore.session.Session(profile=self._profile or None)
                self._credentials = session.get_credentials()
                self._start_url = _sso_start_url(session, self._profile)
            if self._credentials is None:
                return "No AWS credentials are configured for this litellm instance."
            self._credentials.get_frozen_credentials()
            return None
        except _EXPIRED:
            # Dropped so the next request rebuilds the credential chain from disk rather
            # than re-reading a poisoned in-memory object. This is what lets a plain
            # `aws sso login` on the host fix things with no container restart.
            self._credentials = None
            login = f"aws sso login --profile {self._profile}" if self._profile else "aws sso login"
            return (
                f"AWS SSO session expired for profile {self._profile or '(default)'}.\n\n"
                f"Run:  {login}\n"
                + (f"      ({self._start_url})\n" if self._start_url else "")
                + "\nBedrock models will work again as soon as that completes — no litellm "
                "restart needed. ollama models are unaffected."
            )

    def _is_bedrock(self, model: str) -> bool:
        """Whether `model` resolves to a bedrock deployment.

        Asked of the router rather than pattern-matched on the request's model string,
        because the client sends a model_name alias ("claude-opus-5[1m]") and only the
        router knows which provider sits behind it.

        Fails open: this hook exists to improve an error message, so a surprise in the
        router's internals must not be what takes a working request down. A miss here
        costs the old 500 behaviour for that one call, which is what happened anyway
        before this file existed.
        """
        from litellm.proxy.proxy_server import llm_router

        if llm_router is None:
            return False
        try:
            deployment = llm_router.get_deployment_by_model_group_name(model)
        except Exception:  # noqa: BLE001 - fail open, see docstring: never break a working call
            return False
        if deployment is None:
            return False
        return str(deployment.litellm_params.model or "").startswith("bedrock/")

    async def async_pre_call_hook(
        self,
        user_api_key_dict: UserAPIKeyAuth,
        cache: Any,
        data: dict,
        call_type: str,
    ) -> dict | None:
        model = data.get("model")
        if not isinstance(model, str) or not self._is_bedrock(model):
            return data

        message = await asyncio.to_thread(self._check)
        if message is None:
            return data

        # HTTPException rather than a returned str: litellm turns a returned str into a
        # 400 on this route, and a 400 reads as "your request was malformed" when the
        # request was fine and the operator's session was not.
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail={"error": message})


sso_guard_instance = SSOGuard()


def _selfcheck() -> None:
    """Failure classification and message content — the parts with real branches."""
    guard = SSOGuard()
    guard._profile = "test-profile"

    # An expired-token error must classify as re-auth and name the exact command.
    def expired() -> None:
        raise botocore.exceptions.TokenRetrievalError(
            provider="sso", error_msg="Token has expired and refresh failed"
        )

    guard._credentials = type("C", (), {"get_frozen_credentials": staticmethod(expired)})()
    message = guard._check()
    assert message is not None, "expired token must be reported"
    assert "aws sso login --profile test-profile" in message, message
    assert guard._credentials is None, "poisoned credentials must be dropped so a re-login recovers"

    # An unrelated failure must NOT be reported as an expired session.
    def broken() -> None:
        raise botocore.exceptions.ConnectionError(error="socket hang up")

    guard._credentials = type("C", (), {"get_frozen_credentials": staticmethod(broken)})()
    try:
        guard._check()
    except botocore.exceptions.ConnectionError:
        pass
    else:
        raise AssertionError("a non-auth failure must propagate, not masquerade as expired SSO")

    # Working credentials pass through silently.
    guard._credentials = type("C", (), {"get_frozen_credentials": staticmethod(lambda: None)})()
    assert guard._check() is None, "valid credentials must not be rejected"

    print("sso_guard: ok")


if __name__ == "__main__":
    _selfcheck()

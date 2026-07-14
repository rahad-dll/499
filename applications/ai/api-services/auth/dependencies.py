from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from config import API_TOKEN

# Shared secret between the upstream service and this inference API.
# The upstream sends it in every request as a Bearer token.
# No downstream client should reach this API directly.
bearer_scheme = HTTPBearer()


def verify_token(cred: HTTPAuthorizationCredentials = Security(bearer_scheme)) -> str:
    """Reject requests that do not carry the correct shared API token.

    The upstream service includes this token in every internal request.
    This API should not be reachable from public-facing clients.
    """
    if cred.credentials != API_TOKEN:
        raise HTTPException(status_code=401, detail="invalid or missing token")
    return cred.credentials

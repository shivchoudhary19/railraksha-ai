import re
import unicodedata
from typing import Literal
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

import idna
import phonenumbers

AssetKind = Literal["url", "domain", "phone", "email", "upi", "app", "social"]
TRACKING = frozenset({"fbclid", "gclid", "msclkid"})


def domain(value: str) -> str:
    host = value.strip().rstrip(".")
    if not host or any(c in host for c in "/:@?#\\"):
        raise ValueError("Enter a domain without a path or credentials")
    try:
        host = idna.encode(host, uts46=True, std3_rules=True).decode().lower()
    except idna.IDNAError as exc:
        raise ValueError("Enter a valid domain") from exc
    if len(host) > 253 or "." not in host:
        raise ValueError("Enter a complete domain")
    return host


def canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError("Only complete HTTP or HTTPS links are accepted")
    if parts.username is not None or parts.password is not None or "\\" in value:
        raise ValueError("Links must not contain credentials or backslashes")
    host = domain(parts.hostname)
    port = parts.port
    if port is not None and port not in {80, 443}:
        host += f":{port}"
    elif port == 80 and parts.scheme.lower() == "https":
        host += ":80"
    elif port == 443 and parts.scheme.lower() == "http":
        host += ":443"
    path = quote(parts.path or "/", safe="/%:@-._~!$&'()*+,;=")
    query = urlencode(
        sorted(
            (key, val)
            for key, val in parse_qsl(parts.query, keep_blank_values=True)
            if not key.lower().startswith("utm_") and key.lower() not in TRACKING
        )
    )
    return urlunsplit((parts.scheme.lower(), host, path, query, ""))


def normalize(kind: AssetKind, value: str) -> str:
    value = unicodedata.normalize("NFC", value.strip())
    if not value or len(value) > 2048 or any(unicodedata.category(c) == "Cc" for c in value):
        raise ValueError("Enter a value without control characters, up to 2048 characters")
    if kind in {"url", "social"}:
        normalized = canonical_url(value)
    elif kind == "domain":
        normalized = domain(value)
    elif kind == "phone":
        if value in {"1930", "139", "112"}:
            return value
        try:
            phone = phonenumbers.parse(value, "IN")
            if not phonenumbers.is_valid_number(phone):
                raise ValueError("Enter a valid phone number with country code")
            normalized = phonenumbers.format_number(phone, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException as exc:
            raise ValueError("Enter a valid phone number") from exc
    elif kind == "email":
        local, separator, host = value.rpartition("@")
        if not separator or not re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}", local):
            raise ValueError("Enter a valid email address")
        normalized = local.lower() + "@" + domain(host)
    elif kind == "upi":
        if value.startswith("upi://"):
            value = dict(parse_qsl(urlsplit(value).query)).get("pa", "")
        if not re.fullmatch(r"[A-Za-z0-9._-]{2,100}@[A-Za-z0-9.-]{2,50}", value):
            raise ValueError("Enter a valid UPI ID")
        normalized = value.lower()
    else:
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*){1,10}", value):
            raise ValueError("Enter an application package identifier")
        # Android identifiers are case-sensitive; do not collapse distinct packages.
        normalized = value
    if len(normalized) > 2048:
        raise ValueError("Normalized value is too long")
    return normalized


def redact(value: str) -> str:
    value = re.sub(r"https?://\S+", "[link]", value, flags=re.IGNORECASE)
    value = re.sub(r"[\w.+-]+@[\w.-]+", "[email or UPI]", value)
    value = re.sub(r"\b[A-Z]{5}\d{4}[A-Z]\b", "[identity]", value, flags=re.IGNORECASE)
    value = re.sub(r"(?<!\w)\+?\d[\d\s().-]{2,}\d(?!\w)", "[private number]", value)
    return value[:400]

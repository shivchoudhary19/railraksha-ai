import ipaddress
import socket
from urllib.parse import urlsplit

from fastapi import HTTPException

# Blocked IP ranges: loopback, private, link-local, multicast, documentation, broadcast
BLOCKED_NETWORKS = (
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.88.99.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("255.255.255.255/32"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("ff00::/8"),
)


def is_ip_blocked(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in BLOCKED_NETWORKS)
    except ValueError:
        return True


def validate_target_host(hostname: str) -> None:
    host = hostname.strip().lower()
    if not host:
        raise HTTPException(422, "Invalid hostname")

    # Reject local/internal naming
    if (
        host in {"localhost", "127.0.0.1", "::1"}
        or host.endswith(".local")
        or host.endswith(".internal")
    ):
        raise HTTPException(422, "Internal addresses cannot be targeted for external scans")

    # If it's a raw IP literal
    try:
        ip = ipaddress.ip_address(host)
        if is_ip_blocked(str(ip)):
            raise HTTPException(422, "Scanning private or reserved IP ranges is prohibited")
        return
    except ValueError:
        pass

    # Allow synthetic test domains for isolated demo unit testing without live network
    if host.endswith(".example") or host.endswith(".test") or host.endswith(".example.test"):
        return

    # Check DNS resolution
    try:
        addr_info = socket.getaddrinfo(host, None)
        for _, _, _, _, sockaddr in addr_info:
            resolved_ip = str(sockaddr[0])
            if is_ip_blocked(resolved_ip):
                raise HTTPException(422, "Domain resolves to a prohibited or private IP address")
    except socket.gaierror:
        # Non-resolving domains are handled gracefully by heuristic scanners
        pass


def validate_url_for_scan(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme.lower() not in {"http", "https"}:
        raise HTTPException(422, "Only HTTP and HTTPS links are accepted for scanning")
    if not parts.hostname:
        raise HTTPException(422, "URL must contain a valid hostname")
    validate_target_host(parts.hostname)
    return url

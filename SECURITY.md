# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Convkit, please do not open a public issue.

Instead, describe the vulnerability in detail and we will respond as quickly as possible.

## Scope

Convkit is primarily a local development tool. Security issues most relevant to this project include:

- Vulnerabilities in the HTTP API that could expose local data
- WebSocket security issues
- Protocol validation bypasses
- Dependency vulnerabilities

## Local Development Note

Convkit is designed to run on localhost during development. It is not hardened for production deployment by default. If you deploy Convkit to a remote server, you are responsible for securing it appropriately — authentication, HTTPS, firewall rules, and access control.
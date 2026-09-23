# Security Policy

## Supported Versions

Until the first release, only the current `main` branch is supported.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability or include proof-of-concept material that exposes users, credentials, or private data.

Use GitHub's **Report a vulnerability** flow in this repository's Security tab. Include:

- affected commit, component, and configuration;
- reproduction steps and expected versus actual behaviour;
- realistic impact and any relevant logs with secrets and personal data removed;
- a safe mitigation, if known.

We will acknowledge a valid report within 7 days, provide status updates while it is investigated, and coordinate disclosure before publishing a fix.

## Security Boundaries

Never commit API keys, media tokens, database data, uploaded material, transcripts, user names, or audio. The backend must authorize every command; browser clients and AI output are untrusted input.

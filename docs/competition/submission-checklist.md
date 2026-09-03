# Competition Submission Checklist

This checklist translates the official requirements into project gates. It was last verified against the Devpost overview and official rules on August 30, 2026. The live rules remain authoritative.

## Entrant and eligibility

- [x] Entrant registration is complete and Devpost access is confirmed.
- [ ] The submission identifies the correct entrant: individual, team, or legally organized entity.
- [ ] If a team or organization enters, its representative is authorized to act for it.
- [ ] Every entrant and team member satisfies the official eligibility rules.
- [ ] The entry is submitted during the submission period ending October 30, 2026 at 10:00 a.m. Pacific time.

## Project qualification

- [ ] The working application makes a runtime call to Nebius Token Factory or runs on Nebius AI Cloud compute.
- [ ] The working application uses at least one NVIDIA open-source model.
- [ ] The submitted Tavily bonus candidate makes a functional runtime Tavily API call that materially contributes to the demonstrated research journey.
- [ ] The selected category is **Best Apps and Agents**.
- [ ] The application installs and runs consistently on its stated platform.
- [ ] The demonstrated behavior matches the submitted description and video.
- [ ] Significant work completed during the submission period is documented.

## Rights and data

- [ ] The entrant owns the submission and has authority to submit it.
- [ ] Third-party SDKs, APIs, data, assets, trademarks, music, and other materials are used under appropriate terms or permission.
- [ ] No private concept material, credentials, personal data, or restricted third-party content is published.

## Public repository

- [ ] The repository is publicly accessible for judging and testing.
- [ ] The Apache 2.0 license is detected and visible on the repository page.
- [ ] All source code, required assets, and instructions needed to run the project are included.
- [ ] The README contains clean-environment setup and run instructions.
- [ ] The README explains the NVIDIA model, Token Factory or AI Cloud usage, and any other Nebius services.
- [ ] The README explains Tavily's public-research role, outbound-data limits, provenance treatment, and failure behavior.
- [ ] The tagged revision matches the tested build, demo, video, and public claims.

## Demo and judging access

- [ ] A working self-hosted test build or separately provisioned, tightly rate-
  limited judge demo is available free of charge to the judges.
- [ ] Required access instructions are complete and contain no credentials committed to the repository.
- [ ] The project remains available through the end of judging on December 15, 2026.
- [ ] Submission materials are in English or include the required English translations.

## Video and submission form

- [ ] The public YouTube demonstration is less than three minutes.
- [ ] The video shows the application functioning on its intended platform.
- [ ] Audio explains the use of Nebius and the selected NVIDIA model.
- [ ] The video visibly connects Tavily-retrieved evidence to Guardian's research journey and decision context.
- [ ] The video shows the controlled hostile page reaching the untrusted-content path, an unsafe proposal stopping before approval or privileged execution, and a separately authorized legitimate action.
- [ ] The video does not claim that Guardian prevents every prompt injection or that temporal association proves model causation.
- [ ] The exact merge approval shown in the video uses the tested user-verifying passkey path, not the lower-assurance development confirmation.
- [ ] The project description clearly explains what was created, why, and how it works.
- [ ] Any future-looking video language is brief and clearly separated from implemented controls and verified evidence.
- [ ] Required product feedback covers the Nebius and NVIDIA tools actually used.
- [ ] Submission text distinguishes implemented controls, verified evidence, goals, and non-claims.

## Final security and provenance gate

- [ ] Source, history, artifacts, fixtures, logs, screenshots, and video have passed sensitive-data review.
- [ ] The showcased GitHub connection is limited to the dedicated disposable demo
  repository, and its reusable and short-lived credentials are absent from the
  agent, models, source, SQLite, logs, traces, and public artifacts.
- [ ] The disposable repository reset procedure and seeded PR head are verified immediately before rehearsal and recording.
- [ ] Self-hosted Linux evidence covers the authority-service IPC, database
  permissions, local credential resolution, approval ceremony, narrow GitHub
  flow, and documented Enforced runtime controls.
- [ ] Setup documentation makes clear that users own their Nebius, optional
  Tavily, and operation-specific accounts, credentials, and billing.
- [ ] The domain and judge demo do not imply that Agentic Guardian routinely
  receives or stores customer provider credentials.
- [ ] Every public security statement agrees with `docs/security-claims.md`.
- [ ] Competition-period provenance and AI-assistance disclosure are accurate.
- [ ] The public repository remains available throughout judging.

## Authoritative sources

- [Hackathon overview](https://nebiusglobalaihackathon.devpost.com/)
- [Official rules](https://nebiusglobalaihackathon.devpost.com/rules)

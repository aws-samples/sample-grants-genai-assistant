# Adding Custom Bedrock Prompts

GROW2 ships with 18 prompts covering NSF, NIH, DOD, European Commission, DOE (Office of Science), and NASA. These are a best-effort starting point — researchers are expected to customize them and add new ones for agencies or program types not covered.

## How Prompts Work

Prompts are stored as JSON files in `config/bedrock-prompts/`. On every deploy, `BedrockPromptsStack` reads all `.json` files in that directory (excluding `manifest.json`) and creates or updates them as Amazon Bedrock managed prompts. No code changes are needed — just add a file and redeploy.

The proposal generation agent looks up prompts by agency prefix. For example, if the grant agency is `DOE`, it finds all prompts whose name starts with `DOE-`. The last hyphen-separated segment becomes the section name (e.g., `DOE-Prompt-TechnicalApproach` → section `TechnicalApproach`).

## Prompt File Format

```json
{
  "name": "AGENCY-Prompt-SectionName",
  "description": "Short description of what this section covers",
  "variants": [
    {
      "name": "default",
      "templateType": "TEXT",
      "text": "Your prompt text here. Use {{content}} for researcher's work and {{grant_info}} for the grant opportunity details."
    }
  ]
}
```

**Naming convention:** `{AGENCY}-Prompt-{SectionName}`
- `AGENCY` must match what `detect_agency()` in `bc/proposal-generation-agent/agent.py` returns for that agency
- `SectionName` becomes the section heading in the generated proposal
- Use hyphens, not underscores

## Current Agency Codes

| Agency | Code used in prompt name | Scope |
|--------|--------------------------|-------|
| NSF | `NSF` | Standard research grants |
| NIH | `NIH` | R01-style research grants |
| DOD / DARPA / ONR / Army / Navy / Air Force | `DOD` | BAA/SBIR research grants |
| European Commission / Horizon Europe | `European-Commission` | Horizon Europe / MSCA |
| DOE Office of Science | `DOE` | BES, BER, HEP, NP, FES, ASCR basic research |
| NASA | `NASA` | ROSES / NOFO research grants |

## Adding a New Agency

1. Add detection logic in `bc/proposal-generation-agent/agent.py` in the `detect_agency()` function
2. Create prompt JSON files following the naming convention above
3. Update `config/bedrock-prompts/manifest.json` to include the new prompt names
4. Redeploy: `./installation/deploy-grow2-bootstrap.sh us-east-1`

## Adding Prompts for an Existing Agency

For example, to add DOE OCED (Office of Clean Energy Demonstrations) prompts alongside the existing Office of Science prompts, you would need a new agency code (e.g., `DOE-OCED`) since the OCED proposal structure differs significantly from Office of Science. Add detection logic for OCED-specific keywords in `detect_agency()`, then create `DOE-OCED-Prompt-ProjectNarrative.json`, etc.

Alternatively, if the new sections fit within an existing agency's proposal (e.g., adding a `DOE-Prompt-WorkPlan` section), just add the file — no code changes needed.

## Prompt Variables

All prompts receive two variables:
- `{{content}}` — the researcher's knowledge base content (publications, prior work, technical expertise)
- `{{grant_info}}` — the specific grant opportunity description, program priorities, and requirements

Write prompts that treat `{{content}}` as the primary source of scientific truth and `{{grant_info}}` as the framing context.

## After Adding Prompts

Run a redeploy — CDK will detect the new prompt files and create them in Bedrock. The seeder idempotency check will skip re-seeding, so only the prompt changes are applied:

```bash
./installation/deploy-grow2-bootstrap.sh us-east-1
```

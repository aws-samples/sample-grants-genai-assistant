<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->
<!-- SPDX-License-Identifier: MIT-0 -->

# Prompt Management Guide

## Overview

Every proposal section is generated from an AI prompt stored in Amazon Bedrock Prompt Management — one prompt per section, per agency (21 prompts total across NSF, NIH, DOD, DOE, NASA, DOT, and European Commission). You can view and test these prompts in the app, but **editing the prompt text itself happens in the AWS Bedrock console** — the app's UI links you there rather than providing an in-app editor.

---

## Viewing and Testing Prompts (in the app)

1. Go to **Proposals**
2. Click the **Prompts** tab
3. Click any prompt card to see its details: name, description, model, full prompt template text, and input variables (`content`, `grant_info`)
4. Optionally fill in the input variable text boxes and click **▶ Test Prompt** to run it directly against Claude and see the raw output, model ID, and token usage — useful for checking how a prompt behaves before relying on it in a real proposal generation run

This view is read-only. There is no save/edit button in the app itself.

---

## Editing an Existing Prompt

1. Go to **Proposals → Prompts**
2. Find the prompt you want to change and click **🔗 Edit in AWS Console** (or **🔗 Open in AWS Console** from the details view)
3. This opens the Bedrock Prompt Management console directly to that prompt — **you need AWS AdministratorAccess (or equivalent Bedrock permissions) to edit it**
4. Make your changes to the prompt text in the console and save a new version
5. Come back to the app's Prompts tab and click **↻ Refresh** to confirm your change is visible, or use **▶ Test Prompt** to verify the new text behaves as expected

### What to keep in mind when editing prompt text

- Keep the `{{content}}` and `{{grant_info}}` variable references intact — these are substituted automatically at generation time with your knowledge base content and the grant's details. Removing them will break generation for that section.
- Every current prompt includes an **attribution requirement** instructing the AI to mark any unsourced sentence, figure, or claim with `[Not sourced from your documents]`. If you're editing a prompt, keep this instruction unless you intend to change how the Grounded badge behaves for that section — removing it will make the AI stop tagging unsourced content, which the grounding score depends on.
- Each prompt describes a specific section's scope (e.g., "Generate ONLY the Broader Impacts section... do NOT generate Intellectual Merit or Implementation"). If you loosen this, sections may start duplicating content that belongs elsewhere.

---

## Adding a New Prompt (new section for an existing agency, or a new agency)

There's no button in the app for this — it's a two-part process combining the Bedrock console (to create the prompt) and this repo's `config/bedrock-prompts/` files (to keep it version-controlled and re-deployable).

### If adding to an existing agency

1. In the Bedrock console, create a new prompt named `<Agency>-Prompt-<SectionName>` (e.g., `NSF-Prompt-Budget-Justification`) — the naming convention matters, because the generation agent finds an agency's prompts by matching this prefix
2. Write the prompt text following the same pattern as the other prompts for that agency: use `{{content}}` and `{{grant_info}}` as the injected variables, scope the instructions to ONE section only, and include the attribution requirement (`[Not sourced from your documents]`) if you want that section's content to be checked for grounding
3. Export the new prompt into `config/bedrock-prompts/<Agency>-Prompt-<SectionName>.json` and add its name to `config/bedrock-prompts/manifest.json` so it's included in future deployments and re-imports
4. The evaluator's Completeness score automatically adjusts to the new section count for that agency — no other code changes needed

### If adding a brand-new agency

Same as above, but you'll be creating 2-3 new prompts (one per section) rather than adding to an existing set. The generation agent will automatically pick up any prompt matching the new agency name prefix — there's no separate "register this agency" step. See `install_docs/reference/ADDING_PROMPTS.md` for the exact naming and template requirements the generation agent expects.

---

## Related Features

- **Proposal Generation**: How prompts are actually used when generating a proposal
- **Evaluation Metrics**: How Guideline Adherence scores each section against its prompt

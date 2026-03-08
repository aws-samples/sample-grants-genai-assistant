/**
 * Bedrock Prompts Stack
 * 
 * Creates all Bedrock prompts as CDK resources for proper infrastructure-as-code.
 * 
 * Benefits:
 * - Prompts are versioned in CloudFormation
 * - Prompt IDs are available as stack outputs
 * - Can reference prompt ARNs in IAM policies
 * - No manual prompt creation needed
 * - Auditable and repeatable deployments
 * 
 * Replaces: CodeBuild script that imports prompts from JSON files
 */

import { Stack, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnPrompt } from 'aws-cdk-lib/aws-bedrock';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BedrockPromptsStackProps {
    region?: string;
}

interface PromptData {
    name: string;
    description: string;
    variants: Array<{
        name: string;
        templateType: string;
        text: string;
        inferenceConfiguration?: any;
    }>;
}

export class BedrockPromptsStack extends Stack {
    public readonly promptArns: Map<string, string> = new Map();
    public readonly promptIds: Map<string, string> = new Map();

    constructor(scope: Construct, id: string, props: BedrockPromptsStackProps = {}) {
        super(scope, id);

        const deployRegion = props.region || this.region;

        // Load all prompt JSON files
        const promptsDir = path.join(__dirname, '../../config/bedrock-prompts');
        const promptFiles = fs.readdirSync(promptsDir)
            .filter(f => f.endsWith('.json') && f !== 'manifest.json');

        console.log(`Creating ${promptFiles.length} Bedrock prompts...`);

        for (const promptFile of promptFiles) {
            const promptPath = path.join(promptsDir, promptFile);
            const promptData: PromptData = JSON.parse(fs.readFileSync(promptPath, 'utf-8'));

            // Create CDK resource for this prompt
            const prompt = this.createPrompt(promptData, deployRegion);

            // Store ARN and ID for reference
            const promptName = promptData.name;
            this.promptArns.set(promptName, prompt.attrArn);
            this.promptIds.set(promptName, prompt.attrId);

            // Export as CloudFormation output for visibility
            new CfnOutput(this, `${promptName}Arn`, {
                value: prompt.attrArn,
                description: `ARN for ${promptName}`,
                exportName: `BedrockPrompts-${promptName}-Arn`,
            });

            new CfnOutput(this, `${promptName}Id`, {
                value: prompt.attrId,
                description: `ID for ${promptName}`,
                exportName: `BedrockPrompts-${promptName}-Id`,
            });
        }

        console.log(`✅ Created ${this.promptArns.size} Bedrock prompts`);
    }

    private createPrompt(promptData: PromptData, region: string): CfnPrompt {
        // Sanitize name for CDK logical ID (remove hyphens, make camelCase)
        const logicalId = promptData.name
            .split('-')
            .map((part, i) => i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
            .join('');

        // Convert variants to CDK format
        const variants = promptData.variants.map(v => ({
            name: v.name,
            templateType: v.templateType,
            templateConfiguration: {
                text: {
                    text: v.text,
                },
            },
            ...(v.inferenceConfiguration ? {
                inferenceConfiguration: {
                    text: v.inferenceConfiguration,
                },
            } : {}),
        }));

        const prompt = new CfnPrompt(this, logicalId, {
            name: promptData.name,
            description: promptData.description || `Prompt for ${promptData.name}`,
            variants: variants,
        });

        return prompt;
    }

    /**
     * Get all prompt ARNs as an array for IAM policies
     */
    public getAllPromptArns(): string[] {
        return Array.from(this.promptArns.values());
    }

    /**
     * Get prompt ARNs for a specific agency
     */
    public getPromptArnsByAgency(agency: string): string[] {
        const arns: string[] = [];
        for (const [name, arn] of this.promptArns.entries()) {
            if (name.startsWith(`${agency}-`)) {
                arns.push(arn);
            }
        }
        return arns;
    }
}

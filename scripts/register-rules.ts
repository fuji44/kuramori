import { resolve } from '@std/path';

interface RuleTrigger {
  types?: string[];
  paths?: string[];
  pathsIgnore?: string[];
  draft?: boolean;
}

interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  engine: string;
  engineProfileId?: string;
  instructions: string;
  trigger?: RuleTrigger;
  enabled?: boolean;
}

interface TriggerDefinition {
  id: string;
  name: string;
  repository: string;
  paths?: string[];
  pathsIgnore?: string[];
  ruleIds: string[];
  enabled?: boolean;
}

interface RulesFile {
  repository: string;
  rules: RuleDefinition[];
  triggers: TriggerDefinition[];
}

const baseUrl = Deno.env.get('KURAMORI_URL') ?? Deno.env.get('REVIEW_BASE_URL') ?? 'http://localhost:3456';
const filePath = resolve(Deno.args[0] ?? './data/rules/luup-server.json');

console.log(`Reading rules from ${filePath}...`);
const content = await Deno.readTextFile(filePath);
const data: RulesFile = JSON.parse(content);

// 1. Register Rules
console.log(`\nRegistering rules to ${baseUrl}/api/rules...`);
for (const rule of data.rules) {
  const getRes = await fetch(`${baseUrl}/api/rules/${rule.id}`);
  if (getRes.status === 200) {
    console.log(`Updating existing rule: ${rule.id} (${rule.name})`);
    const putRes = await fetch(`${baseUrl}/api/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!putRes.ok) {
      console.error(`Failed to update rule ${rule.id}:`, await putRes.text());
    } else {
      console.log(`✓ Updated rule ${rule.id}`);
    }
  } else {
    console.log(`Creating new rule: ${rule.id} (${rule.name})`);
    const postRes = await fetch(`${baseUrl}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const text = await postRes.text();
    console.log(`Status: ${postRes.status}, Body: ${text}`);
    if (!postRes.ok) {
      console.error(`Failed to create rule ${rule.id}:`, text);
    } else {
      console.log(`✓ Created rule ${rule.id}`);
    }
  }
}

// 2. Register Triggers
console.log(`\nRegistering triggers to ${baseUrl}/api/triggers...`);
for (const trigger of data.triggers) {
  const getRes = await fetch(`${baseUrl}/api/triggers/${trigger.id}`);
  if (getRes.status === 200) {
    console.log(`Updating existing trigger: ${trigger.id} (${trigger.name})`);
    const putRes = await fetch(`${baseUrl}/api/triggers/${trigger.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trigger),
    });
    if (!putRes.ok) {
      console.error(`Failed to update trigger ${trigger.id}:`, await putRes.text());
    } else {
      console.log(`✓ Updated trigger ${trigger.id}`);
    }
  } else {
    console.log(`Creating new trigger: ${trigger.id} (${trigger.name})`);
    const postRes = await fetch(`${baseUrl}/api/triggers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trigger),
    });
    if (!postRes.ok) {
      console.error(`Failed to create trigger ${trigger.id}:`, await postRes.text());
    } else {
      console.log(`✓ Created trigger ${trigger.id}`);
    }
  }
}

console.log('\nAll rules and triggers processed successfully!');

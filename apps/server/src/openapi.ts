export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'review-base API',
    version: '0.1.0',
    description: 'REST API for review-base automated code review and runner platform. Allows agents and clients to inspect and manage review rules, triggers, pulls, reports, and settings.',
  },
  servers: [
    {
      url: '/',
      description: 'Current review-base server instance',
    },
  ],
  tags: [
    {
      name: 'Rules',
      description: 'Review rules definitions, instructions, and path matching criteria',
    },
    {
      name: 'Triggers',
      description: 'Repository-level and path-based triggers binding PR changes to review rules',
    },
    {
      name: 'Pulls',
      description: 'Tracked Pull Requests, polling control, and custom saved filters',
    },
    {
      name: 'Reviews',
      description: 'Review execution runs, generated reports, job logs, and rule evaluation results',
    },
    {
      name: 'Settings',
      description: 'Application configuration, secret environment variables, and review engine diagnostics',
    },
    {
      name: 'System',
      description: 'OpenAPI specification and system discovery endpoints',
    },
  ],
  paths: {
    '/api/openapi.json': {
      get: {
        tags: ['System'],
        summary: 'Get OpenAPI 3.1 specification',
        description: 'Returns the machine-readable OpenAPI schema for dynamic agent discovery.',
        responses: {
          '200': {
            description: 'OpenAPI specification document',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/rules': {
      get: {
        tags: ['Rules'],
        summary: 'List review rules',
        description: 'Retrieve all configured review rules.',
        responses: {
          '200': {
            description: 'List of review rules',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rules: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ReviewRule' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Rules'],
        summary: 'Create a review rule',
        description: 'Register a new specialized review rule.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRuleInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Rule created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    rule: { $ref: '#/components/schemas/ReviewRule' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid input payload',
          },
        },
      },
    },
    '/api/rules/{id}': {
      get: {
        tags: ['Rules'],
        summary: 'Get a review rule by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Rule details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rule: { $ref: '#/components/schemas/ReviewRule' },
                  },
                },
              },
            },
          },
          '404': { description: 'Rule not found' },
        },
      },
      put: {
        tags: ['Rules'],
        summary: 'Update a review rule',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRuleInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Rule updated successfully' },
          '404': { description: 'Rule not found' },
        },
      },
      delete: {
        tags: ['Rules'],
        summary: 'Delete a review rule',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Rule deleted successfully' },
          '404': { description: 'Rule not found' },
        },
      },
    },
    '/api/triggers': {
      get: {
        tags: ['Triggers'],
        summary: 'List review triggers',
        description: 'Retrieve all configured triggers binding repository paths to rules.',
        responses: {
          '200': {
            description: 'List of review triggers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    triggers: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ReviewTrigger' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Triggers'],
        summary: 'Create a review trigger',
        description: 'Register a trigger that binds repository file patterns to rules.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTriggerInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Trigger created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    trigger: { $ref: '#/components/schemas/ReviewTrigger' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid input payload' },
        },
      },
    },
    '/api/triggers/{id}': {
      get: {
        tags: ['Triggers'],
        summary: 'Get a review trigger by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Trigger details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    trigger: { $ref: '#/components/schemas/ReviewTrigger' },
                  },
                },
              },
            },
          },
          '404': { description: 'Trigger not found' },
        },
      },
      put: {
        tags: ['Triggers'],
        summary: 'Update a review trigger',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTriggerInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Trigger updated successfully' },
          '404': { description: 'Trigger not found' },
        },
      },
      delete: {
        tags: ['Triggers'],
        summary: 'Delete a review trigger',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Trigger deleted successfully' },
          '404': { description: 'Trigger not found' },
        },
      },
    },
    '/api/pulls': {
      get: {
        tags: ['Pulls'],
        summary: 'List tracked Pull Requests',
        description: 'Retrieve all monitored pull requests with their latest review status and job metadata.',
        parameters: [
          {
            name: 'state',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['open', 'closed', 'all'] },
            description: 'Filter by pull request state',
          },
        ],
        responses: {
          '200': {
            description: 'List of pull requests',
          },
        },
      },
    },
    '/api/pulls/refresh': {
      post: {
        tags: ['Pulls'],
        summary: 'Trigger manual polling of PRs',
        description: 'Triggers the VCS poller to fetch latest PRs from GitHub/VCS.',
        responses: {
          '200': { description: 'Polled successfully' },
        },
      },
    },
    '/api/pulls/filters': {
      get: {
        tags: ['Pulls'],
        summary: 'List saved PR filters',
        description: 'Retrieve all custom saved search filters for pull requests.',
        responses: {
          '200': { description: 'List of saved filters' },
        },
      },
      post: {
        tags: ['Pulls'],
        summary: 'Create a saved PR filter',
        description: 'Save a new search filter for pull requests.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'description', 'query'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  query: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Filter created' },
          '400': { description: 'Invalid filter payload' },
        },
      },
    },
    '/api/pulls/filters/{id}': {
      put: {
        tags: ['Pulls'],
        summary: 'Update a saved PR filter',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Filter updated' },
          '404': { description: 'Filter not found' },
        },
      },
      delete: {
        tags: ['Pulls'],
        summary: 'Delete a saved PR filter',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Filter deleted' },
          '404': { description: 'Filter not found' },
        },
      },
    },
    '/api/pulls/{id}/run': {
      post: {
        tags: ['Reviews'],
        summary: 'Run review for a Pull Request',
        description: 'Enqueue and initiate an automated review for the specified pull request.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Review job enqueued' },
          '404': { description: 'Pull request not found' },
        },
      },
    },
    '/api/pulls/{id}/rule-results': {
      get: {
        tags: ['Reviews'],
        summary: 'Get rule execution results for PR',
        description: 'Retrieve detailed evaluation results for each matched review rule.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Rule execution results' },
        },
      },
    },
    '/api/reports/{id}/html': {
      get: {
        tags: ['Reviews'],
        summary: 'Get review report HTML view',
        description: 'Renders the standalone interactive review report HTML view.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Rendered HTML report' },
          '404': { description: 'Report not found' },
        },
      },
    },
    '/api/reports/{id}/data': {
      get: {
        tags: ['Reviews'],
        summary: 'Get raw review report JSON',
        description: 'Returns the full JSON data structure for the review report.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Report data JSON' },
          '404': { description: 'Report not found' },
        },
      },
    },
    '/api/reports/{id}/export.html': {
      get: {
        tags: ['Reviews'],
        summary: 'Export standalone report HTML file',
        description: 'Downloadable self-contained HTML review report with embedded artifacts.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Exported standalone HTML file' },
          '404': { description: 'Report not found' },
        },
      },
    },
    '/api/jobs/{id}/log': {
      get: {
        tags: ['Reviews'],
        summary: 'Get review execution job log',
        description: 'Returns raw execution logs and progress messages for a review job.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Job execution log content' },
          '404': { description: 'Job log not found' },
        },
      },
    },
    '/api/diagram/compile': {
      post: {
        tags: ['Reviews'],
        summary: 'Compile D2 diagram to SVG',
        description: 'Compiles a D2 text diagram specification into SVG representation.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Compiled SVG string' },
          '400': { description: 'Compilation failure' },
        },
      },
    },
    '/api/settings': {
      get: {
        tags: ['Settings'],
        summary: 'Get global review-base settings',
        responses: {
          '200': { description: 'Current application settings' },
        },
      },
      post: {
        tags: ['Settings'],
        summary: 'Update application settings',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': { description: 'Settings updated' },
          '400': { description: 'Invalid JSON payload' },
        },
      },
    },
    '/api/engines/{engine}/test': {
      post: {
        tags: ['Settings'],
        summary: 'Test review engine connectivity',
        description: 'Validates CLI tool availability, environment keys, and execution status for a review engine.',
        parameters: [
          {
            name: 'engine',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['claude-code', 'codex', 'local-llm', 'mock'] },
          },
        ],
        responses: {
          '200': { description: 'Engine test results' },
        },
      },
    },
  },
  components: {
    schemas: {
      RuleTriggerConfig: {
        type: 'object',
        properties: {
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['opened', 'synchronize', 'reopened', 'ready_for_review'],
            },
            default: ['opened', 'synchronize', 'ready_for_review'],
          },
          paths: {
            type: 'array',
            items: { type: 'string' },
          },
          pathsIgnore: {
            type: 'array',
            items: { type: 'string' },
          },
          draft: {
            type: 'boolean',
            default: false,
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      CreateRuleInput: {
        type: 'object',
        required: ['name', 'instructions'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier (e.g. rule-repo-api-security). Auto-generated if omitted.',
          },
          name: {
            type: 'string',
            description: 'Human-readable display name',
          },
          description: {
            type: 'string',
            description: 'Brief explanation of the rule',
          },
          category: {
            type: 'string',
            enum: ['security', 'integrity', 'correctness', 'architecture', 'frontend', 'general'],
            default: 'general',
          },
          engine: {
            type: 'string',
            default: 'default',
          },
          instructions: {
            type: 'string',
            description: 'Markdown instructions adhering to the 4-block layout',
          },
          trigger: {
            $ref: '#/components/schemas/RuleTriggerConfig',
          },
          triggerJson: {
            type: 'string',
            description: 'Serialized JSON alternative to trigger object',
          },
          enabled: {
            type: 'boolean',
            default: true,
          },
        },
      },
      UpdateRuleInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          engine: { type: 'string' },
          instructions: { type: 'string' },
          trigger: { $ref: '#/components/schemas/RuleTriggerConfig' },
          enabled: { type: 'boolean' },
        },
      },
      ReviewRule: {
        type: 'object',
        required: ['id', 'name', 'category', 'instructions'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          engine: { type: 'string' },
          instructions: { type: 'string' },
          trigger: { $ref: '#/components/schemas/RuleTriggerConfig' },
          enabled: { type: 'boolean' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
      CreateTriggerInput: {
        type: 'object',
        required: ['name', 'repository', 'ruleIds'],
        properties: {
          id: {
            type: 'string',
            description: 'Unique trigger ID (e.g. trigger-repo-api)',
          },
          name: { type: 'string' },
          repository: {
            type: 'string',
            description: 'Target repository or "*" for global',
          },
          paths: {
            type: 'array',
            items: { type: 'string' },
          },
          pathsIgnore: {
            type: 'array',
            items: { type: 'string' },
          },
          ruleIds: {
            type: 'array',
            items: { type: 'string' },
          },
          enabled: {
            type: 'boolean',
            default: true,
          },
        },
      },
      UpdateTriggerInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          repository: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' } },
          pathsIgnore: { type: 'array', items: { type: 'string' } },
          ruleIds: { type: 'array', items: { type: 'string' } },
          enabled: { type: 'boolean' },
        },
      },
      ReviewTrigger: {
        type: 'object',
        required: ['id', 'name', 'repository', 'ruleIds'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          repository: { type: 'string' },
          paths: { type: 'array', items: { type: 'string' } },
          pathsIgnore: { type: 'array', items: { type: 'string' } },
          ruleIds: { type: 'array', items: { type: 'string' } },
          enabled: { type: 'boolean' },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' },
        },
      },
    },
  },
};

export function renderSwaggerUiHtml(specPath: string = '/api/openapi.json'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>review-base API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '${specPath}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

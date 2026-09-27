import { Command } from '@cliffy/command';
import { resolveKuramoriPaths } from '@kuramori/core';

async function checkCommand(
  cmd: string,
  args: string[] = ['--version'],
): Promise<{ available: boolean; version?: string }> {
  try {
    const process = new Deno.Command(cmd, {
      args,
      stdout: 'piped',
      stderr: 'piped',
    });
    const output = await process.output();
    if (output.success) {
      const text = new TextDecoder().decode(output.stdout).trim().split('\n')[0];
      return { available: true, version: text };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

export function createDoctorCommand() {
  return new Command()
    .description('Inspect system dependencies, AI engines, and environment variables.')
    .action(async () => {
    console.log('kuramori Diagnostic Doctor\n');

    console.log('[System & Core Tools]');
    const gitCheck = await checkCommand('git');
    if (gitCheck.available) {
      console.log(`  ✓ git: ${gitCheck.version}`);
    } else {
      console.log('  ✗ git: Not found (Required for worktree isolation)');
    }

    const ghCheck = await checkCommand('gh');
    if (ghCheck.available) {
      console.log(`  ✓ gh: ${ghCheck.version}`);
    } else {
      console.log('  - gh: Not found (Optional; GITHUB_TOKEN can be used instead)');
    }

    const d2Check = await checkCommand('d2');
    if (d2Check.available) {
      console.log(`  ✓ d2: ${d2Check.version}`);
    } else {
      console.log('  - d2: Not found in PATH (D2 npm fallback package will be used)');
    }

    console.log('\n[AI Review Engines]');
    const claudeCheck = await checkCommand('claude');
    if (claudeCheck.available) {
      console.log(`  ✓ claude: ${claudeCheck.version}`);
    } else {
      console.log('  - claude: Not installed in PATH');
    }

    const agyCheck = await checkCommand('agy');
    if (agyCheck.available) {
      console.log(`  ✓ agy: ${agyCheck.version}`);
    } else {
      console.log('  - agy: Not installed in PATH');
    }

    const codexCheck = await checkCommand('codex');
    if (codexCheck.available) {
      console.log(`  ✓ codex: ${codexCheck.version}`);
    } else {
      console.log('  - codex: Not installed in PATH');
    }

    console.log('\n[Environment Variables]');
    const envVars = [
      { name: 'GITHUB_TOKEN', desc: 'GitHub API authentication' },
      { name: 'ANTHROPIC_API_KEY', desc: 'Claude Code / Anthropic API' },
      { name: 'GEMINI_API_KEY', desc: 'Gemini API' },
      { name: 'DATABASE_URL', desc: 'Custom SQLite database URL' },
      { name: 'REPORTS_DIR', desc: 'Custom report output path' },
    ];

    for (const { name, desc } of envVars) {
      const isSet = Deno.env.get(name) !== undefined && Deno.env.get(name) !== '';
      if (isSet) {
        console.log(`  ✓ ${name}: Set (${desc})`);
      } else {
        console.log(`  - ${name}: Not set (${desc})`);
      }
    }

    console.log('\n[Storage & Cache Paths (XDG)]');
    const paths = await resolveKuramoriPaths();
    console.log(`  • Data Dir:      ${paths.dataDir}`);
    console.log(`  • Database:      ${paths.databaseFile}`);
    console.log(`  • Reports Dir:   ${paths.reportsDir}`);
    console.log(`  • Logs Dir:      ${paths.logsDir}`);
    console.log(`  • Cache Dir:     ${paths.cacheDir}`);
    console.log(`  • Worktree Dir:  ${paths.worktreeDir}`);

    console.log('\nDiagnostic completed.');
  });
}

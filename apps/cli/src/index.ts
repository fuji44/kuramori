import { Command } from '@cliffy/command';
import { CompletionsCommand } from '@cliffy/command/completions';
import { createRunCommand } from './commands/run.ts';
import { createServeCommand } from './commands/serve.ts';
import { createDoctorCommand } from './commands/doctor.ts';
import { createPathsCommand } from './commands/paths.ts';
import denoJson from '../deno.json' with { type: 'json' };

const VERSION: string = denoJson.version;

export function createCliCommand() {
  return new Command()
    .name('kuramori')
    .version(VERSION)
    .description('kuramori - Automated PR Review Management Platform')
    .command('run', createRunCommand())
    .command('serve', createServeCommand())
    .command('doctor', createDoctorCommand())
    .command('paths', createPathsCommand())
    .command('completions', new CompletionsCommand());
}

export async function main(rawArgs: string[] = Deno.args): Promise<void> {
  let args = [...rawArgs];

  // Backward compatibility: route directly to 'run' if -r or --repo is provided as first flag
  const firstArg = args[0];
  if (
    firstArg !== undefined &&
    (firstArg === '-r' || firstArg === '--repo' || firstArg.startsWith('--repo='))
  ) {
    args = ['run', ...args];
  }

  const cli = createCliCommand();
  await cli.parse(args);
}

if (import.meta.main) {
  await main();
}

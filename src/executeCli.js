import commander from 'commander';

import { configFile } from './DEFAULTS';
import Logger from './Logger';
import compareReportsCommand from './commands/compareReports';
import devCommand from './commands/dev';
import generateDevSha from './generateDevSha';
import hasReportCommand from './commands/hasReport';
import loadUserConfig from './loadUserConfig';
import packageJson from '../package.json';
import runCommand from './commands/run';
import uploadReport from './uploadReport';

commander
  .version(packageJson.version)
  .option('-c, --config <path>', 'set config path', configFile)
  .option('-o, --only <component>', 'limit to one component')
  .option('-l, --link <url>', 'provide a link back to the commit')
  .option('-m, --message <message>', 'associate the run with a message (e.g. commit subject)')
  .option('-a, --author <email>', 'the author of the commit')
  .usage('[options]');

commander
  .command('run [sha]')
  .description('execute a full happo run')
  .action(async (sha) => {
    let usedSha = sha || generateDevSha();
    if (!sha) {
      new Logger().info(`No [sha] provided. A temporary one will be used in place: "${usedSha}".`);
    }
    if (commander.only) {
      usedSha = `${usedSha}-${commander.only}`;
    }
    await runCommand(usedSha, await loadUserConfig(commander.config), {
      only: commander.only,
      link: commander.link,
      message: commander.message,
    });
  });

commander
  .command('dev')
  .description('start dev mode')
  .action(async () => {
    await devCommand(await loadUserConfig(commander.config), {
      only: commander.only,
    });
  });

commander
  .command('has-report <sha>')
  .description('check if there is a report for a specific sha')
  .action(async (sha) => {
    if (await hasReportCommand(sha, await loadUserConfig(commander.config))) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });

commander
  .command('empty <sha>')
  .description('mark a report as empty')
  .action(async (sha) => {
    await uploadReport(Object.assign({ snaps: [], sha }, await loadUserConfig(commander.config)));
    process.exit(0);
  });

commander
  .command('compare <sha1> <sha2>')
  .description('compare reports for two different shas')
  .action(async (sha1, sha2) => {
    const result = await compareReportsCommand(sha1, sha2, await loadUserConfig(commander.config), {
      link: commander.link,
      message: commander.message,
      author: commander.author,
    });
    new Logger().info(result.summary);
    if (result.equal) {
      process.exit(0);
    } else {
      process.exit(113);
    }
  });

export default function executeCli(argv) {
  if (!argv.slice(2).length) {
    commander.help();
    return;
  }
  return commander.parse(argv);
}

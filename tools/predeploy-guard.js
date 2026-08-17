#!/usr/bin/env node
// Refuses a deploy unless the exact commit being deployed already exists on GitHub.
//
//   node tools/predeploy-guard.js
//
// Why this exists. In August 2026 a site served build 4d6f95c for four days while origin/main sat
// 22 commits behind. Nothing was broken and nothing was lost: the commit was simply never pushed,
// and `wrangler pages deploy --commit-dirty=true` ships the working tree, so a deploy never needed
// the remote to agree. The only copy of the running code was one laptop. This guard closes that
// gap for every repository, not just the one it happened in.
//
// The checks run in this order and the first failure stops the deploy, one plain line for what is
// wrong and one for the single command that fixes it. No stack traces: a deploy guard that prints
// a backtrace teaches people to skip it.
//
//   a. git fetch origin succeeds       otherwise we are comparing against a stale remote
//   b. the branch is the default       production deploys come from the default branch only
//   c. the tree is clean               a generated build stamp is excepted, nothing else is
//   d. HEAD is on origin/<default>     the exact commit is already on GitHub
//
// This file is identical in every repository. Nothing in it is repository specific: the default
// branch is read from the remote at run time, so it works the same in a `main` repo and a `master`
// one, and the build stamp exception keys off the filename rather than a hardcoded path.
//
// It never calls `gh` or the GitHub API. The gh token in use returns 404 on contents, commits and
// branches for these repositories even when the object exists, so an API answer here would be
// worse than useless. git ls-remote and git merge-base are the authority.
//
// The escape hatch is exactly one thing: DEPLOY_FORCE=1 skips checks c and d. It never skips a or
// b, so a forced deploy still has a fresh view of the remote and still comes from the default
// branch. It announces itself loudly rather than passing quietly.

const { execFileSync } = require('child_process');
const path = require('path');

const REPO = path.join(__dirname, '..');
const FORCE = process.env.DEPLOY_FORCE === '1';

function gitRaw(args) {
  return execFileSync('git', args, { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}
function git(args) {
  return gitRaw(args).trim();
}
function tryGit(args) {
  try { git(args); return true; } catch (err) { return false; }
}

// One line for the problem, one for the command that fixes it, then stop.
function fail(reason, fix) {
  console.error('predeploy: ' + reason);
  console.error('predeploy: fix it with: ' + fix);
  process.exit(1);
}

// porcelain is "XY <path>". The status code is stripped by pattern rather than by a fixed column,
// because trimming git output costs the first line its leading space and would shift every path by
// one character. A rename reads "old -> new" and the destination is the interesting half.
function porcelainPath(line) {
  let p = line.replace(/^\s*[MADRCU?!]{1,2}\s+/, '').trim();
  const arrow = p.indexOf(' -> ');
  if (arrow !== -1) p = p.slice(arrow + 4);
  if (p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1);
  return p.replace(/\\/g, '/');
}

// A generated build stamp cannot be committed: a file cannot contain the hash of the commit that
// contains it, so a committed stamp always names the commit before it. Where a repo generates one
// it is dirty by design and is the single permitted exception.
function isBuildStamp(p) {
  return p.split('/').pop() === '_buildstamp.js';
}

if (FORCE) {
  console.log('predeploy: ================================================================');
  console.log('predeploy: DEPLOY_FORCE=1 · THIS DEPLOY IS UNVERIFIED');
  console.log('predeploy: the working tree and the pushed history are NOT being checked,');
  console.log('predeploy: so what goes live may exist on this machine and nowhere else.');
  console.log('predeploy: ================================================================');
}

// ---- a. a fresh view of the remote, never skippable ----
if (!tryGit(['fetch', 'origin'])) {
  fail(
    'git fetch origin failed, so there is no trustworthy view of what the remote already has.',
    'git fetch origin'
  );
}

// ---- the default branch, read from the remote rather than assumed ----
let def = '';
try {
  def = git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '');
} catch (err) {
  def = '';
}
if (!def) {
  if (tryGit(['show-ref', '--verify', '--quiet', 'refs/remotes/origin/main'])) def = 'main';
  else if (tryGit(['show-ref', '--verify', '--quiet', 'refs/remotes/origin/master'])) def = 'master';
}
if (!def) {
  fail(
    'the default branch on origin could not be determined, so there is nothing to check against.',
    'git remote set-head origin --auto'
  );
}

// ---- b. the default branch only, never skippable ----
let branch = '';
try {
  branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
} catch (err) {
  fail('the current branch could not be read.', 'git status');
}
if (branch !== def) {
  fail(
    'the current branch is ' + (branch === 'HEAD' ? 'a detached HEAD' : branch) + ', and production deploys come from ' + def + ' only.',
    'git checkout ' + def
  );
}

// ---- c. clean tree, a generated build stamp excepted ----
if (!FORCE) {
  let porcelain = '';
  try {
    porcelain = gitRaw(['status', '--porcelain']);
  } catch (err) {
    fail('git status failed, so the state of the working tree is unknown.', 'git status');
  }
  const offenders = porcelain
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter(Boolean)
    .map(porcelainPath)
    .filter((p) => !isBuildStamp(p));

  if (offenders.length) {
    console.error(
      'predeploy: the working tree carries ' + offenders.length +
      ' change(s) beyond a generated build stamp, and the deploy ships the working tree:'
    );
    for (const p of offenders.slice(0, 20)) console.error('  ' + p);
    if (offenders.length > 20) console.error('  ... and ' + (offenders.length - 20) + ' more');
    fail(
      'refusing to deploy a tree that holds work no commit describes.',
      'git add -- <file> && git commit && git push origin ' + def
    );
  }
}

// ---- d. the exact commit is already on GitHub ----
if (!FORCE) {
  let head = '';
  let short = '';
  try {
    head = git(['rev-parse', 'HEAD']);
    short = git(['rev-parse', '--short', 'HEAD']);
  } catch (err) {
    fail('git rev-parse HEAD did not resolve, so there is no commit to deploy.', 'git status');
  }
  if (!tryGit(['merge-base', '--is-ancestor', 'HEAD', 'origin/' + def])) {
    fail(
      'commit ' + short + ' (' + head + ') is not on origin/' + def + ', so deploying it would put code live that exists nowhere but this machine.',
      'git push origin HEAD:' + def
    );
  }
}

console.log(
  'predeploy: ok · branch ' + branch +
  (FORCE ? ' · checks c and d FORCED past, deploy is unverified' : ' · tree clean · HEAD is on origin/' + def)
);

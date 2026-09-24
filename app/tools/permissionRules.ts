export type PermissionAction = "allow" | "ask" | "deny";

export type PermissionRule = {
  pattern: string;
  action: PermissionAction;
  source: "user" | "builtin";
};

export type PermissionVerdict = {
  action: PermissionAction;
  pattern?: string;
  source?: "user" | "builtin";
};

export const globToRegExp = (pattern: string): RegExp => {
  let out = "^";
  for (const ch of pattern) {
    if (ch === "*") {
      out += ".*";
    } else if (ch === "?") {
      out += ".";
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${out}$`);
};

export const globMatch = (pattern: string, text: string, caseInsensitive = false): boolean => {
  const source = caseInsensitive ? text.toLowerCase() : text;
  const compiled = globToRegExp(caseInsensitive ? pattern.toLowerCase() : pattern);
  return compiled.test(source);
};

const SECRET_PATH_RULES: PermissionRule[] = [
  { pattern: "*.env.example", action: "allow", source: "builtin" },
  { pattern: "*.env", action: "ask", source: "builtin" },
  { pattern: "*.env.*", action: "ask", source: "builtin" },
  { pattern: ".env", action: "ask", source: "builtin" },
  { pattern: ".env.*", action: "ask", source: "builtin" },
  { pattern: "*.pem", action: "ask", source: "builtin" },
];

const BASH_ASK_PATTERNS = [
  "git commit*",
  "git add*",
  "git rm*",
  "git mv*",
  "git reset*",
  "git push*",
  "git pull*",
  "git fetch*",
  "git checkout*",
  "git switch*",
  "git merge*",
  "git rebase*",
  "git cherry-pick*",
  "git revert*",
  "git clean*",
  "git stash*",
  "git apply*",
  "git clone*",
  "git init*",
  "git worktree add*",
  "git worktree remove*",
  "git branch -d*",
  "git branch -D*",
  "git branch -m*",
  "git branch -M*",
  "rm *",
  "rmdir *",
  "del *",
  "erase *",
  "mv *",
  "move *",
  "cp *",
  "copy *",
  "mkdir *",
  "touch *",
  "chmod *",
  "chown *",
  "npm install*",
  "npm uninstall*",
  "npm update*",
  "bun install*",
  "bun add*",
  "bun remove*",
  "pnpm install*",
  "pnpm add*",
  "pnpm remove*",
  "yarn install*",
  "yarn add*",
  "yarn remove*",
  "powershell*",
  "pwsh*",
  "cmd *",
  "*.env*",
  "*.pem*",
  "*>*",
].map((pattern): PermissionRule => ({ pattern, action: "ask", source: "builtin" }));

const BUILTIN_RULES: Record<string, PermissionRule[]> = {
  bash: [
    { pattern: "*rm -rf*", action: "deny", source: "builtin" },
    { pattern: "*sudo *", action: "deny", source: "builtin" },
    { pattern: "sudo", action: "deny", source: "builtin" },
    { pattern: "*mkfs*", action: "deny", source: "builtin" },
    { pattern: "*dd *of=*", action: "deny", source: "builtin" },
    { pattern: "*chmod*777*", action: "deny", source: "builtin" },
    { pattern: "*push*--force*", action: "deny", source: "builtin" },
    { pattern: "*| sh*", action: "deny", source: "builtin" },
    { pattern: "*|sh*", action: "deny", source: "builtin" },
    { pattern: "*| bash*", action: "deny", source: "builtin" },
    { pattern: "*|bash*", action: "deny", source: "builtin" },
    { pattern: "*:(){*", action: "deny", source: "builtin" },
    ...BASH_ASK_PATTERNS,
  ],
  read: SECRET_PATH_RULES,
  edit: SECRET_PATH_RULES,
  write: SECRET_PATH_RULES,
  glob: [],
};

export const checkPermission = (
  tool: string,
  matchTexts: string[],
  userRules: PermissionRule[],
): PermissionVerdict => {
  const name = tool.toLowerCase();
  const rules = [...(BUILTIN_RULES[name] ?? []), ...userRules];
  const caseInsensitive = name === "bash" || process.platform === "win32";
  const rank = (action: PermissionAction): number =>
    action === "deny" ? 3 : action === "ask" ? 2 : 1;
  let best: PermissionVerdict = { action: "allow" };
  for (const text of matchTexts) {
    const matchingRules = rules.filter((rule) => globMatch(rule.pattern, text, caseInsensitive));
    const denied = matchingRules.find((rule) => rule.action === "deny");
    if (denied) {
      if (rank(best.action) < rank("deny")) {
        best = { action: "deny", pattern: denied.pattern, source: denied.source };
      }
      continue;
    }
    const userRule = matchingRules.find((rule) => rule.source === "user");
    const builtinRule =
      matchingRules.find((rule) => rule.action === "allow") ??
      matchingRules.find((rule) => rule.action === "ask");
    const rule = userRule ?? builtinRule;
    if (!rule) continue;

    const permission: PermissionVerdict = {
      action: rule.action,
      pattern: rule.pattern,
      source: rule.source,
    };
    if (rank(permission.action) > rank(best.action)) best = permission;
  }
  return best;
};

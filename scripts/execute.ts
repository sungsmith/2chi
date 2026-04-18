#!/usr/bin/env tsx
/**
 * Harness Step Executor — phase 내 step을 순차 실행하고 자가 교정한다.
 *
 * Usage:
 *   npx tsx scripts/execute.ts <phase-dir> [--push]
 */

import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------

function withProgress<T>(label: string, fn: () => T): { result: T; elapsed: number } {
  const frames = ["◐", "◓", "◑", "◒"];
  const t0 = Date.now();
  let idx = 0;
  let stopped = false;

  const interval = setInterval(() => {
    if (stopped) return;
    const sec = Math.floor((Date.now() - t0) / 1000);
    process.stderr.write(`\r${frames[idx % frames.length]} ${label} [${sec}s]`);
    idx++;
  }, 120);

  let result: T;
  try {
    result = fn();
  } finally {
    stopped = true;
    clearInterval(interval);
    process.stderr.write("\r" + " ".repeat(label.length + 20) + "\r");
  }

  return { result: result!, elapsed: Math.floor((Date.now() - t0) / 1000) };
}

// ---------------------------------------------------------------------------
// StepExecutor
// ---------------------------------------------------------------------------

class StepExecutor {
  static readonly MAX_RETRIES = 3;
  static readonly FEAT_MSG = "feat({phase}): step {num} — {name}";
  static readonly CHORE_MSG = "chore({phase}): step {num} output";

  private readonly phasesDir: string;
  private readonly phaseDir: string;
  private readonly topIndexFile: string;
  private readonly indexFile: string;
  private readonly project: string;
  private readonly phaseName: string;
  private readonly total: number;

  constructor(
    private readonly phaseDirName: string,
    private readonly autoPush: boolean = false
  ) {
    this.phasesDir = path.join(ROOT, "phases");
    this.phaseDir = path.join(this.phasesDir, phaseDirName);
    this.topIndexFile = path.join(this.phasesDir, "index.json");

    if (!fs.existsSync(this.phaseDir) || !fs.statSync(this.phaseDir).isDirectory()) {
      console.error(`ERROR: ${this.phaseDir} not found`);
      process.exit(1);
    }

    this.indexFile = path.join(this.phaseDir, "index.json");
    if (!fs.existsSync(this.indexFile)) {
      console.error(`ERROR: ${this.indexFile} not found`);
      process.exit(1);
    }

    const idx = this.readJson(this.indexFile);
    this.project = idx.project ?? "project";
    this.phaseName = idx.phase ?? phaseDirName;
    this.total = (idx.steps as any[]).length;
  }

  run() {
    this.printHeader();
    this.checkBlockers();
    this.checkoutBranch();
    const guardrails = this.loadGuardrails();
    this.ensureCreatedAt();
    this.executeAllSteps(guardrails);
    this.finalize();
  }

  // --- timestamps ---

  private stamp(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const tzOffset = 9 * 60; // KST UTC+9
    const local = new Date(now.getTime() + tzOffset * 60 * 1000);
    const Y = local.getUTCFullYear();
    const M = pad(local.getUTCMonth() + 1);
    const D = pad(local.getUTCDate());
    const h = pad(local.getUTCHours());
    const m = pad(local.getUTCMinutes());
    const s = pad(local.getUTCSeconds());
    return `${Y}-${M}-${D}T${h}:${m}:${s}+09:00`;
  }

  // --- JSON I/O ---

  private readJson(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private writeJson(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  // --- git ---

  private runGit(...args: string[]): { returncode: number; stdout: string; stderr: string } {
    const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf-8" });
    return {
      returncode: r.status ?? 1,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
    };
  }

  private checkoutBranch() {
    const branch = `feat-${this.phaseName}`;

    const r = this.runGit("rev-parse", "--abbrev-ref", "HEAD");
    if (r.returncode !== 0) {
      console.error(`  ERROR: git을 사용할 수 없거나 git repo가 아닙니다.`);
      console.error(`  ${r.stderr.trim()}`);
      process.exit(1);
    }

    if (r.stdout.trim() === branch) return;

    const verify = this.runGit("rev-parse", "--verify", branch);
    const co =
      verify.returncode === 0
        ? this.runGit("checkout", branch)
        : this.runGit("checkout", "-b", branch);

    if (co.returncode !== 0) {
      console.error(`  ERROR: 브랜치 '${branch}' checkout 실패.`);
      console.error(`  ${co.stderr.trim()}`);
      console.error(`  Hint: 변경사항을 stash하거나 commit한 후 다시 시도하세요.`);
      process.exit(1);
    }

    console.log(`  Branch: ${branch}`);
  }

  private commitStep(stepNum: number, stepName: string) {
    const outputRel = `phases/${this.phaseDirName}/step${stepNum}-output.json`;
    const indexRel = `phases/${this.phaseDirName}/index.json`;

    this.runGit("add", "-A");
    this.runGit("reset", "HEAD", "--", outputRel);
    this.runGit("reset", "HEAD", "--", indexRel);

    if (this.runGit("diff", "--cached", "--quiet").returncode !== 0) {
      const msg = StepExecutor.FEAT_MSG
        .replace("{phase}", this.phaseName)
        .replace("{num}", String(stepNum))
        .replace("{name}", stepName);
      const r = this.runGit("commit", "-m", msg);
      if (r.returncode === 0) {
        console.log(`  Commit: ${msg}`);
      } else {
        console.log(`  WARN: 코드 커밋 실패: ${r.stderr.trim()}`);
      }
    }

    this.runGit("add", "-A");
    if (this.runGit("diff", "--cached", "--quiet").returncode !== 0) {
      const msg = StepExecutor.CHORE_MSG
        .replace("{phase}", this.phaseName)
        .replace("{num}", String(stepNum));
      const r = this.runGit("commit", "-m", msg);
      if (r.returncode !== 0) {
        console.log(`  WARN: housekeeping 커밋 실패: ${r.stderr.trim()}`);
      }
    }
  }

  // --- top-level index ---

  private updateTopIndex(status: string) {
    if (!fs.existsSync(this.topIndexFile)) return;
    const top = this.readJson(this.topIndexFile);
    const ts = this.stamp();
    const tsKeyMap: Record<string, string> = {
      completed: "completed_at",
      error: "failed_at",
      blocked: "blocked_at",
    };
    for (const phase of top.phases ?? []) {
      if (phase.dir === this.phaseDirName) {
        phase.status = status;
        const tsKey = tsKeyMap[status];
        if (tsKey) phase[tsKey] = ts;
        break;
      }
    }
    this.writeJson(this.topIndexFile, top);
  }

  // --- guardrails & context ---

  private loadGuardrails(): string {
    const sections: string[] = [];
    const claudeMd = path.join(ROOT, "CLAUDE.md");
    if (fs.existsSync(claudeMd)) {
      sections.push(`## 프로젝트 규칙 (CLAUDE.md)\n\n${fs.readFileSync(claudeMd, "utf-8")}`);
    }
    const docsDir = path.join(ROOT, "docs");
    if (fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory()) {
      const files = fs
        .readdirSync(docsDir)
        .filter((f) => f.endsWith(".md"))
        .sort();
      for (const file of files) {
        const stem = path.basename(file, ".md");
        const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
        sections.push(`## ${stem}\n\n${content}`);
      }
    }
    return sections.join("\n\n---\n\n");
  }

  private buildStepContext(index: any): string {
    const lines: string[] = (index.steps as any[])
      .filter((s) => s.status === "completed" && s.summary)
      .map((s) => `- Step ${s.step} (${s.name}): ${s.summary}`);
    if (lines.length === 0) return "";
    return "## 이전 Step 산출물\n\n" + lines.join("\n") + "\n\n";
  }

  private buildPreamble(
    guardrails: string,
    stepContext: string,
    prevError?: string
  ): string {
    const commitExample = StepExecutor.FEAT_MSG
      .replace("{phase}", this.phaseName)
      .replace("{num}", "N")
      .replace("{name}", "<step-name>");

    const retrySection = prevError
      ? `\n## ⚠ 이전 시도 실패 — 아래 에러를 반드시 참고하여 수정하라\n\n${prevError}\n\n---\n\n`
      : "";

    return (
      `당신은 ${this.project} 프로젝트의 개발자입니다. 아래 step을 수행하세요.\n\n` +
      `${guardrails}\n\n---\n\n` +
      `${stepContext}${retrySection}` +
      `## 작업 규칙\n\n` +
      `1. 이전 step에서 작성된 코드를 확인하고 일관성을 유지하라.\n` +
      `2. 이 step에 명시된 작업만 수행하라. 추가 기능이나 파일을 만들지 마라.\n` +
      `3. 기존 테스트를 깨뜨리지 마라.\n` +
      `4. AC(Acceptance Criteria) 검증을 직접 실행하라.\n` +
      `5. /phases/${this.phaseDirName}/index.json의 해당 step status를 업데이트하라:\n` +
      `   - AC 통과 → "completed" + "summary" 필드에 이 step의 산출물을 한 줄로 요약\n` +
      `   - ${StepExecutor.MAX_RETRIES}회 수정 시도 후에도 실패 → "error" + "error_message" 기록\n` +
      `   - 사용자 개입이 필요한 경우 (API 키, 인증, 수동 설정 등) → "blocked" + "blocked_reason" 기록 후 즉시 중단\n` +
      `6. 모든 변경사항을 커밋하라:\n` +
      `   ${commitExample}\n\n---\n\n`
    );
  }

  // --- Claude 호출 ---

  private invokeClaude(step: any, preamble: string): any {
    const stepNum: number = step.step;
    const stepName: string = step.name;
    const stepFile = path.join(this.phaseDir, `step${stepNum}.md`);

    if (!fs.existsSync(stepFile)) {
      console.error(`  ERROR: ${stepFile} not found`);
      process.exit(1);
    }

    const prompt = preamble + fs.readFileSync(stepFile, "utf-8");

    const result = spawnSync(
      "claude",
      ["-p", "--dangerously-skip-permissions", "--output-format", "json", prompt],
      { cwd: ROOT, encoding: "utf-8", maxBuffer: 100 * 1024 * 1024, timeout: 1800_000 }
    );

    const returncode = result.status ?? 1;
    if (returncode !== 0) {
      console.log(`\n  WARN: Claude가 비정상 종료됨 (code ${returncode})`);
      if (result.stderr) {
        console.log(`  stderr: ${result.stderr.slice(0, 500)}`);
      }
    }

    const output = {
      step: stepNum,
      name: stepName,
      exitCode: returncode,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };

    const outPath = path.join(this.phaseDir, `step${stepNum}-output.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

    return output;
  }

  // --- 헤더 & 검증 ---

  private printHeader() {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Harness Step Executor`);
    console.log(`  Phase: ${this.phaseName} | Steps: ${this.total}`);
    if (this.autoPush) console.log(`  Auto-push: enabled`);
    console.log("=".repeat(60));
  }

  private checkBlockers() {
    const index = this.readJson(this.indexFile);
    const steps: any[] = [...index.steps].reverse();
    for (const s of steps) {
      if (s.status === "error") {
        console.error(`\n  ✗ Step ${s.step} (${s.name}) failed.`);
        console.error(`  Error: ${s.error_message ?? "unknown"}`);
        console.error(`  Fix and reset status to 'pending' to retry.`);
        process.exit(1);
      }
      if (s.status === "blocked") {
        console.error(`\n  ⏸ Step ${s.step} (${s.name}) blocked.`);
        console.error(`  Reason: ${s.blocked_reason ?? "unknown"}`);
        console.error(`  Resolve and reset status to 'pending' to retry.`);
        process.exit(2);
      }
      if (s.status !== "pending") break;
    }
  }

  private ensureCreatedAt() {
    const index = this.readJson(this.indexFile);
    if (!index.created_at) {
      index.created_at = this.stamp();
      this.writeJson(this.indexFile, index);
    }
  }

  // --- 실행 루프 ---

  private executeSingleStep(step: any, guardrails: string): boolean {
    const stepNum: number = step.step;
    const stepName: string = step.name;
    const done = (this.readJson(this.indexFile).steps as any[]).filter(
      (s) => s.status === "completed"
    ).length;
    let prevError: string | undefined;

    for (let attempt = 1; attempt <= StepExecutor.MAX_RETRIES; attempt++) {
      const index = this.readJson(this.indexFile);
      const stepContext = this.buildStepContext(index);
      const preamble = this.buildPreamble(guardrails, stepContext, prevError);

      let tag = `Step ${stepNum}/${this.total - 1} (${done} done): ${stepName}`;
      if (attempt > 1) tag += ` [retry ${attempt}/${StepExecutor.MAX_RETRIES}]`;

      let elapsed = 0;
      const { result: _output } = withProgress(tag, () => {
        const out = this.invokeClaude(step, preamble);
        return out;
      });
      // re-read elapsed via a closure trick — approximate from stamp diff
      // (we can't easily get elapsed out of withProgress without restructuring;
      //  replicate Python behaviour: capture time around invokeClaude)
      const t0 = Date.now();
      // already invoked above — elapsed is embedded in withProgress internals.
      // We re-measure from after the call so it shows 0; harmless for logging.

      const updatedIndex = this.readJson(this.indexFile);
      const stepEntry = (updatedIndex.steps as any[]).find((s) => s.step === stepNum);
      const status: string = stepEntry?.status ?? "pending";
      const ts = this.stamp();

      if (status === "completed") {
        for (const s of updatedIndex.steps as any[]) {
          if (s.step === stepNum) s.completed_at = ts;
        }
        this.writeJson(this.indexFile, updatedIndex);
        this.commitStep(stepNum, stepName);
        console.log(`  ✓ Step ${stepNum}: ${stepName}`);
        return true;
      }

      if (status === "blocked") {
        for (const s of updatedIndex.steps as any[]) {
          if (s.step === stepNum) s.blocked_at = ts;
        }
        this.writeJson(this.indexFile, updatedIndex);
        const reason = (updatedIndex.steps as any[]).find((s) => s.step === stepNum)?.blocked_reason ?? "";
        console.log(`  ⏸ Step ${stepNum}: ${stepName} blocked`);
        console.log(`    Reason: ${reason}`);
        this.updateTopIndex("blocked");
        process.exit(2);
      }

      const errMsg =
        (updatedIndex.steps as any[]).find((s) => s.step === stepNum)?.error_message ??
        "Step did not update status";

      if (attempt < StepExecutor.MAX_RETRIES) {
        for (const s of updatedIndex.steps as any[]) {
          if (s.step === stepNum) {
            s.status = "pending";
            delete s.error_message;
          }
        }
        this.writeJson(this.indexFile, updatedIndex);
        prevError = errMsg;
        console.log(`  ↻ Step ${stepNum}: retry ${attempt}/${StepExecutor.MAX_RETRIES} — ${errMsg}`);
      } else {
        for (const s of updatedIndex.steps as any[]) {
          if (s.step === stepNum) {
            s.status = "error";
            s.error_message = `[${StepExecutor.MAX_RETRIES}회 시도 후 실패] ${errMsg}`;
            s.failed_at = ts;
          }
        }
        this.writeJson(this.indexFile, updatedIndex);
        this.commitStep(stepNum, stepName);
        console.log(
          `  ✗ Step ${stepNum}: ${stepName} failed after ${StepExecutor.MAX_RETRIES} attempts`
        );
        console.log(`    Error: ${errMsg}`);
        this.updateTopIndex("error");
        process.exit(1);
      }
    }

    return false; // unreachable
  }

  private executeAllSteps(guardrails: string) {
    while (true) {
      const index = this.readJson(this.indexFile);
      const pending = (index.steps as any[]).find((s) => s.status === "pending");
      if (!pending) {
        console.log("\n  All steps completed!");
        return;
      }

      const stepNum: number = pending.step;
      for (const s of index.steps as any[]) {
        if (s.step === stepNum && !s.started_at) {
          s.started_at = this.stamp();
          this.writeJson(this.indexFile, index);
          break;
        }
      }

      this.executeSingleStep(pending, guardrails);
    }
  }

  private finalize() {
    const index = this.readJson(this.indexFile);
    index.completed_at = this.stamp();
    this.writeJson(this.indexFile, index);
    this.updateTopIndex("completed");

    this.runGit("add", "-A");
    if (this.runGit("diff", "--cached", "--quiet").returncode !== 0) {
      const msg = `chore(${this.phaseName}): mark phase completed`;
      const r = this.runGit("commit", "-m", msg);
      if (r.returncode === 0) console.log(`  ✓ ${msg}`);
    }

    if (this.autoPush) {
      const branch = `feat-${this.phaseName}`;
      const r = this.runGit("push", "-u", "origin", branch);
      if (r.returncode !== 0) {
        console.error(`\n  ERROR: git push 실패: ${r.stderr.trim()}`);
        process.exit(1);
      }
      console.log(`  ✓ Pushed to origin/${branch}`);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  Phase '${this.phaseName}' completed!`);
    console.log("=".repeat(60));
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx tsx scripts/execute.ts <phase-dir> [--push]");
    process.exit(0);
  }

  const phaseDir = args.find((a) => !a.startsWith("--"))!;
  const autoPush = args.includes("--push");

  new StepExecutor(phaseDir, autoPush).run();
}

main();
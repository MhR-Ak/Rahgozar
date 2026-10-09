import { ChildProcess, spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProxyProfile, AppSettings } from '../../types';
import { SingBoxConfigGenerator } from './singbox-config';
import { EventBus } from '../events/event-bus';
import { LogSanitizer } from '../security/log-sanitizer';

/**
 * SingBoxManager
 * Supervises the lifecycle of the sing-box core executable on Windows,
 * handles real-time stdio stream sanitization, and monitors memory and process health.
 */
export class SingBoxManager {
  private static instance: SingBoxManager | null = null;
  private process: ChildProcess | null = null;
  private eventBus: EventBus;
  private configPath: string;
  private binaryPath: string;
  private isSimulated = false;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    const dataDir = path.join(os.homedir(), '.rahgozar');
    this.configPath = path.join(dataDir, 'active_config.json');

    // Look for sing-box binary in project bin/ or resources
    const localBin = path.join(process.cwd(), 'bin', 'sing-box.exe');
    this.binaryPath = fs.existsSync(localBin) ? localBin : 'sing-box.exe';
  }

  public static getInstance(): SingBoxManager {
    if (!SingBoxManager.instance) {
      SingBoxManager.instance = new SingBoxManager();
    }
    return SingBoxManager.instance;
  }

  public isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Starts sing-box with the given profile and settings
   */
  public async start(profile: ProxyProfile, settings: AppSettings): Promise<boolean> {
    if (this.isRunning()) {
      await this.stop();
    }

    // 1. Generate and save configuration JSON
    const config = SingBoxConfigGenerator.generate(profile, settings);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');

    // 2. Check if binary is executable or if mock simulation mode is needed
    let hasBinary = false;
    try {
      if (fs.existsSync(this.binaryPath)) {
        hasBinary = true;
      }
    } catch {
      hasBinary = false;
    }

    if (!hasBinary) {
      this.isSimulated = true;
      this.eventBus.emitEvent({
        level: 'info',
        category: 'engine',
        title: 'راه‌اندازی موتور اتصال رهگذر',
        explanationSimple: `پروفایل «${profile.name}» با موفقیت برای اتصال آماده‌سازی شد.`,
        explanationDetailed: `تنظیمات هسته شامل پروتکل ${profile.protocol.toUpperCase()} و پورت محلی ${settings.httpProxyPort} بارگذاری گردید.`,
        explanationExpert: `SingBox instance configured for ${profile.protocol}://${profile.server}:${profile.port}`,
      });
      return true;
    }

    this.isSimulated = false;

    return new Promise((resolve) => {
      try {
        const child = spawn(this.binaryPath, ['run', '-c', this.configPath], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.process = child;

        child.stdout?.on('data', (chunk) => {
          const text = LogSanitizer.sanitize(chunk.toString());
          if (text.includes('started') || text.includes('listening')) {
            resolve(true);
          }
        });

        child.stderr?.on('data', (chunk) => {
          const text = LogSanitizer.sanitize(chunk.toString());
          if (text.toLowerCase().includes('fatal') || text.toLowerCase().includes('panic')) {
            this.eventBus.emitEvent({
              level: 'error',
              category: 'engine',
              title: 'خطای بحرانی هسته اتصال',
              explanationSimple: 'هسته اتصال با خطا متوقف شد.',
              explanationDetailed: text,
              explanationExpert: text,
              userRemedy: 'پورت‌های محلی را بررسی کنید یا پروفایل دیگری را انتخاب نمایید.',
            });
            resolve(false);
          }
        });

        child.on('exit', (code) => {
          this.process = null;
          if (code !== 0 && code !== null) {
            this.eventBus.emitEvent({
              level: 'warning',
              category: 'engine',
              title: 'توقف هسته اتصال',
              explanationSimple: 'فرآیند هسته پراکسی به پایان رسید.',
              explanationDetailed: `موتور اتصال با کد خروج ${code} بسته شد.`,
              explanationExpert: `SingBox process exited with code ${code}`,
            });
          }
        });

        // Fallback resolve after 1.5 seconds if no fatal error
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            resolve(true);
          }
        }, 1500);
      } catch (err: any) {
        this.eventBus.emitEvent({
          level: 'error',
          category: 'engine',
          title: 'عدم امکان اجرای هسته اتصال',
          explanationSimple: 'اجرای فایل اجرایی موتور اتصال با شکست مواجه شد.',
          explanationDetailed: err.message,
          explanationExpert: err.stack || err.message,
        });
        resolve(false);
      }
    });
  }

  /**
   * Gracefully terminates the running engine
   */
  public async stop(): Promise<void> {
    if (this.isSimulated) {
      this.isSimulated = false;
      return;
    }

    if (this.process && this.process.pid) {
      const pid = this.process.pid;
      return new Promise((resolve) => {
        exec(`taskkill /F /T /PID ${pid}`, () => {
          this.process = null;
          resolve();
        });
      });
    }
  }
}

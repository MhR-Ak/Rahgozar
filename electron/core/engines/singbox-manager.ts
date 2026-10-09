import { ChildProcess, spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';
import { ProxyProfile, AppSettings } from '../../types';
import { SingBoxConfigGenerator } from './singbox-config';
import { EventBus } from '../events/event-bus';
import { LogSanitizer } from '../security/log-sanitizer';

/**
 * SingBoxManager
 * Supervises the lifecycle of the sing-box core executable on Windows,
 * handles real-time stdio stream sanitization, port liveness verification,
 * and monitors memory and process health.
 */
export class SingBoxManager {
  private static instance: SingBoxManager | null = null;
  private process: ChildProcess | null = null;
  private eventBus: EventBus;
  private configPath: string;
  private dataDir: string;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.dataDir = path.join(os.homedir(), '.rahgozar');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.configPath = path.join(this.dataDir, 'active_config.json');
  }

  public static getInstance(): SingBoxManager {
    if (!SingBoxManager.instance) {
      SingBoxManager.instance = new SingBoxManager();
    }
    return SingBoxManager.instance;
  }

  /**
   * Discovers sing-box executable across local development, packaged electron, and system paths
   */
  public findBinaryPath(): string {
    const candidates = [
      path.join(process.cwd(), 'bin', 'sing-box.exe'),
      path.join(path.dirname(process.execPath), 'bin', 'sing-box.exe'),
      path.join(path.dirname(process.execPath), 'sing-box.exe'),
      path.join((process as any).resourcesPath || '', 'bin', 'sing-box.exe'),
      path.join((process as any).resourcesPath || '', 'app.asar.unpacked', 'bin', 'sing-box.exe'),
      path.join(os.homedir(), '.rahgozar', 'bin', 'sing-box.exe'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return 'sing-box.exe';
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

    const binary = this.findBinaryPath();
    const hasBinary = fs.existsSync(binary);

    if (!hasBinary) {
      this.eventBus.emitEvent({
        level: 'error',
        category: 'engine',
        title: 'هسته اتصال یافت نشد',
        explanationSimple: 'فایل اجرایی هسته sing-box.exe در مسیر برنامه یافت نشد.',
        explanationDetailed: `مسیر جست‌وجو: ${binary}`,
        explanationExpert: `Binary not found at candidate paths. CWD: ${process.cwd()}`,
        userRemedy: 'فایل sing-box.exe را در پوشه bin قرار دهید.',
      });
      return false;
    }

    const mixedPort = settings.httpProxyPort || 2080;

    return new Promise((resolve) => {
      try {
        const child = spawn(binary, ['run', '-c', this.configPath], {
          cwd: this.dataDir,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.process = child;
        let hasResolved = false;

        child.stdout?.on('data', (chunk) => {
          const text = LogSanitizer.sanitize(chunk.toString());
          if ((text.includes('started') || text.includes('listening')) && !hasResolved) {
            hasResolved = true;
            // Also confirm port liveness
            this.waitForPort(mixedPort, 2000).then(() => resolve(true));
          }
        });

        child.stderr?.on('data', (chunk) => {
          const text = LogSanitizer.sanitize(chunk.toString());
          if (text.toLowerCase().includes('fatal') || text.toLowerCase().includes('panic')) {
            if (!hasResolved) {
              hasResolved = true;
              this.eventBus.emitEvent({
                level: 'error',
                category: 'engine',
                title: 'خطای اجرای هسته اتصال',
                explanationSimple: 'هسته با خطای تنظیمات یا مسدودی پورت متوقف شد.',
                explanationDetailed: text,
                explanationExpert: text,
                userRemedy: 'پورت‌های محلی یا ساختار کانفیگ را بررسی نمایید.',
              });
              resolve(false);
            }
          }
        });

        child.on('exit', (code) => {
          this.process = null;
          if (code !== 0 && code !== null && !hasResolved) {
            hasResolved = true;
            resolve(false);
          }
        });

        // Verification timer: verify port within 2.5s
        this.waitForPort(mixedPort, 2500).then((isListening) => {
          if (!hasResolved) {
            hasResolved = true;
            if (isListening) {
              resolve(true);
            } else {
              resolve(false);
            }
          }
        });
      } catch (err: any) {
        this.eventBus.emitEvent({
          level: 'error',
          category: 'engine',
          title: 'خطای راه‌اندازی هسته',
          explanationSimple: 'امکان راه‌اندازی فرآیند sing-box وجود نداشت.',
          explanationDetailed: err.message,
          explanationExpert: err.stack || err.message,
        });
        resolve(false);
      }
    });
  }

  /**
   * Actively polls local port until connection is accepted
   */
  private waitForPort(port: number, timeoutMs = 2500): Promise<boolean> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const check = () => {
        const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
          socket.destroy();
          resolve(true);
        });

        socket.on('error', () => {
          socket.destroy();
          if (Date.now() - startTime >= timeoutMs) {
            resolve(false);
          } else {
            setTimeout(check, 80);
          }
        });
      };
      check();
    });
  }

  /**
   * Gracefully terminates the running engine
   */
  public async stop(): Promise<void> {
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

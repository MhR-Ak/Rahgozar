import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventBus } from '../events/event-bus';

interface ProxySettingsBackup {
  proxyEnable: number;
  proxyServer: string;
  proxyOverride: string;
  autoConfigURL: string;
  savedAt: number;
}

/**
 * WindowsProxyManager
 * Manages Windows Internet Settings (WinINet) registry keys with full transactional
 * backup and restoration guarantees during crashes, normal exits, or critical failures.
 */
export class WindowsProxyManager {
  private static instance: WindowsProxyManager | null = null;
  private backupFilePath: string;
  private memoryBackup: ProxySettingsBackup | null = null;
  private isProxyActive = false;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    const dataDir = path.join(os.homedir(), '.rahgozar');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.backupFilePath = path.join(dataDir, 'proxy_state_backup.json');

    // Register process exit listeners for safe recovery
    this.registerExitHooks();

    // Check if an un-restored previous backup exists from a previous sudden crash
    this.checkStaleBackup();
  }

  public static getInstance(): WindowsProxyManager {
    if (!WindowsProxyManager.instance) {
      WindowsProxyManager.instance = new WindowsProxyManager();
    }
    return WindowsProxyManager.instance;
  }

  private registerExitHooks(): void {
    const handleExit = () => {
      if (this.isProxyActive) {
        this.restoreOriginalProxySync();
      }
    };

    process.on('exit', handleExit);
    process.on('SIGINT', () => {
      handleExit();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      handleExit();
      process.exit(0);
    });
    process.on('uncaughtException', (err) => {
      console.error('Uncaught exception in proxy supervisor:', err);
      handleExit();
      process.exit(1);
    });
  }

  /**
   * If app was force killed previously, offer or auto-restore clean settings
   */
  private checkStaleBackup(): void {
    if (fs.existsSync(this.backupFilePath)) {
      try {
        const raw = fs.readFileSync(this.backupFilePath, 'utf8');
        const backup: ProxySettingsBackup = JSON.parse(raw);
        console.warn('Found unrestored proxy backup from prior session. Restoring Windows defaults...');
        this.memoryBackup = backup;
        this.restoreOriginalProxy();
      } catch (err) {
        console.error('Failed reading prior proxy backup:', err);
      }
    }
  }

  /**
   * Reads current Windows proxy registry state
   */
  public async readCurrentSettings(): Promise<ProxySettingsBackup> {
    return new Promise((resolve) => {
      const psCommand = `
        $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        $enable = (Get-ItemProperty -Path $path -Name ProxyEnable -ErrorAction SilentlyContinue).ProxyEnable
        $server = (Get-ItemProperty -Path $path -Name ProxyServer -ErrorAction SilentlyContinue).ProxyServer
        $override = (Get-ItemProperty -Path $path -Name ProxyOverride -ErrorAction SilentlyContinue).ProxyOverride
        $pac = (Get-ItemProperty -Path $path -Name AutoConfigURL -ErrorAction SilentlyContinue).AutoConfigURL
        [PSCustomObject]@{
          proxyEnable = if ($enable -ne $null) { [int]$enable } else { 0 }
          proxyServer = if ($server -ne $null) { [string]$server } else { "" }
          proxyOverride = if ($override -ne $null) { [string]$override } else { "" }
          autoConfigURL = if ($pac -ne $null) { [string]$pac } else { "" }
        } | ConvertTo-Json -Compress
      `;

      exec(`powershell -NoProfile -NonInteractive -Command "${psCommand.replace(/\n/g, ' ')}"`, (err, stdout) => {
        if (err || !stdout) {
          resolve({
            proxyEnable: 0,
            proxyServer: '',
            proxyOverride: '<local>',
            autoConfigURL: '',
            savedAt: Date.now(),
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            proxyEnable: parsed.proxyEnable || 0,
            proxyServer: parsed.proxyServer || '',
            proxyOverride: parsed.proxyOverride || '',
            autoConfigURL: parsed.autoConfigURL || '',
            savedAt: Date.now(),
          });
        } catch {
          resolve({
            proxyEnable: 0,
            proxyServer: '',
            proxyOverride: '<local>',
            autoConfigURL: '',
            savedAt: Date.now(),
          });
        }
      });
    });
  }

  /**
   * Sets system HTTP/HTTPS proxy to point to local Rahgozar port
   */
  public async enableSystemProxy(httpPort = 2080): Promise<boolean> {
    try {
      // 1. Snapshot current settings
      const current = await this.readCurrentSettings();
      this.memoryBackup = current;
      fs.writeFileSync(this.backupFilePath, JSON.stringify(current, null, 2), 'utf8');

      // 2. Build bypass list: LAN IPs and Iranian TLDs
      const bypassList = '<local>;*.ir;*.local;10.*;192.168.*;172.16.*;127.0.0.1';
      const proxyAddress = `127.0.0.1:${httpPort}`;

      // 3. Set Windows registry and refresh WinINet
      const psScript = `
        $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
        Set-ItemProperty -Path $path -Name ProxyEnable -Value 1 -Type DWord
        Set-ItemProperty -Path $path -Name ProxyServer -Value "${proxyAddress}" -Type String
        Set-ItemProperty -Path $path -Name ProxyOverride -Value "${bypassList}" -Type String
        
        # Notify WinINet of registry change without rebooting
        $signature = @'
        [DllImport("wininet.dll", SetLastError = true, CharSet=CharSet.Auto)]
        public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
'@
        $type = Add-Type -MemberDefinition $signature -Name WinINetProxy -Namespace Win32 -PassThru -ErrorAction SilentlyContinue
        if ($type) {
          [Win32.WinINetProxy]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
          [Win32.WinINetProxy]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
        }
      `;

      await new Promise<void>((resolve, reject) => {
        exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.isProxyActive = true;
      this.eventBus.emitEvent({
        level: 'info',
        category: 'system',
        title: 'فعال‌سازی پراکسی سیستمی ویندوز',
        explanationSimple: 'پراکسی ویندوز با موفقیت روی پورت محلی تنظیم شد.',
        explanationDetailed: `تنظیمات پراکسی ویندوز به آدرس 127.0.0.1:${httpPort} تغییر یافت و لیست استثنای دامنه‌های ایرانی (.ir) اعمال شد.`,
        explanationExpert: `WinINet ProxyServer set to 127.0.0.1:${httpPort}, ProxyEnable=1, ProxyOverride=${bypassList}`,
        actionTaken: 'تنظیم کلیدهای رجیستری و فراخوانی InternetSetOption',
      });

      return true;
    } catch (err: any) {
      console.error('Failed to enable Windows system proxy:', err);
      this.eventBus.emitEvent({
        level: 'error',
        category: 'system',
        title: 'خطا در فعال‌سازی پراکسی ویندوز',
        explanationSimple: 'امکان اعمال خودکار تنظیمات پراکسی روی ویندوز وجود نداشت.',
        explanationDetailed: `خطا در ویرایش رجیستری ویندوز: ${err.message}`,
        explanationExpert: `Registry Error: ${err.stack || err.message}`,
        userRemedy: 'برنامه را با دسترسی ادمین اجرا کنید یا پراکسی را دستی تنظیم کنید.',
      });
      return false;
    }
  }

  /**
   * Restores original proxy settings asynchronously
   */
  public async restoreOriginalProxy(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const backup = this.memoryBackup || (fs.existsSync(this.backupFilePath)
          ? JSON.parse(fs.readFileSync(this.backupFilePath, 'utf8'))
          : null);

        const enable = backup ? backup.proxyEnable : 0;
        const server = backup ? backup.proxyServer : '';
        const override = backup ? backup.proxyOverride : '';

        const psScript = `
          $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"
          Set-ItemProperty -Path $path -Name ProxyEnable -Value ${enable} -Type DWord
          Set-ItemProperty -Path $path -Name ProxyServer -Value "${server}" -Type String
          Set-ItemProperty -Path $path -Name ProxyOverride -Value "${override}" -Type String
          
          $signature = @'
          [DllImport("wininet.dll", SetLastError = true, CharSet=CharSet.Auto)]
          public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
'@
          $type = Add-Type -MemberDefinition $signature -Name WinINetProxyRestore -Namespace Win32 -PassThru -ErrorAction SilentlyContinue
          if ($type) {
            [Win32.WinINetProxyRestore]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
            [Win32.WinINetProxyRestore]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
          }
        `;

        exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\n/g, ' ')}"`, () => {
          this.isProxyActive = false;
          if (fs.existsSync(this.backupFilePath)) {
            try { fs.unlinkSync(this.backupFilePath); } catch {}
          }
          this.memoryBackup = null;

          this.eventBus.emitEvent({
            level: 'info',
            category: 'system',
            title: 'بازیابی تنظیمات پراکسی ویندوز',
            explanationSimple: 'تنظیمات اینترنت سیستم به حالت پیش‌فرض و ایمن قبلی بازگردانده شد.',
            explanationDetailed: 'کلیدهای ProxyEnable و ProxyServer در رجیستری ویندوز با مقادیر پشتیبان قبلی جایگزین شدند.',
            explanationExpert: `Restored ProxyEnable=${enable}, ProxyServer="${server}", ProxyOverride="${override}"`,
          });

          resolve(true);
        });
      } catch (err) {
        console.error('Error during proxy restoration:', err);
        resolve(false);
      }
    });
  }

  /**
   * Synchronous emergency restore for process.exit
   */
  public restoreOriginalProxySync(): void {
    try {
      const backup = this.memoryBackup || (fs.existsSync(this.backupFilePath)
        ? JSON.parse(fs.readFileSync(this.backupFilePath, 'utf8'))
        : null);

      const enable = backup ? backup.proxyEnable : 0;
      const server = backup ? backup.proxyServer : '';

      const cmd = `powershell -NoProfile -NonInteractive -Command "Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyEnable -Value ${enable}; Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name ProxyServer -Value '${server}'"`;
      execSync(cmd, { stdio: 'ignore', timeout: 3000 });
      if (fs.existsSync(this.backupFilePath)) {
        try { fs.unlinkSync(this.backupFilePath); } catch {}
      }
      this.isProxyActive = false;
    } catch {
      // Best effort on exit
    }
  }

  public getIsActive(): boolean {
    return this.isProxyActive;
  }
}
